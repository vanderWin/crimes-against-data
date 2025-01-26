let currentDevice = "Mobile";
let activeCategory = "Overall"; // Default selected category
let winnersData = [];
let losersData = [];
let searchFeaturesData = []; // Declare global variable to store data
let topDomainsGroupedData; // Declare globally, not as array, but something to be replaced

// ==========================
// Global Chaos variables
// ==========================
let chaosData = [];   // holds your loaded JSON
let chaosParticles;   // PIXI.Container
let chaosDateLines;   // PIXI.Graphics
let chaosApp;         // PIXI.Application
let baseRadius = 160;
let scaleFactor = 3.5;
let centerX, centerY;
let t = 0;            // for animations
let filteredData = []; 
let currentTheta = [];
let startDate, endDate, totalDays;


// --------------
// The chart-drawing function (needs chaosParticles, etc.)
// --------------
function drawChart() {
    chaosParticles.removeChildren();
    chaosDateLines.clear();
  
    if (!filteredData.length) return;
  
    filteredData.forEach((row, i) => {
      const particle = new PIXI.Graphics();
      particle.beginFill(0x15CAB6, 0.75).drawCircle(0, 0, 0.75).endFill();
  
      const adjustedTheta = currentTheta[i] - Math.PI / 2;
      const r = baseRadius + row.avg_delta * scaleFactor;
      particle.x = centerX + Math.cos(adjustedTheta) * r;
      particle.y = centerY + Math.sin(adjustedTheta) * r;
  
      chaosParticles.addChild(particle);
    });
  
    // Draw lines for googleUpdates, etc.
    googleUpdates.forEach(({ date }) => {
      const dateObject = new Date(date);
      if (dateObject >= startDate && dateObject <= endDate) {
        const normalizedDate = (dateObject - startDate) / (24 * 60 * 60 * 1000);
        const angle = (normalizedDate / totalDays) * 2 * Math.PI - Math.PI / 2;
  
        const xStart = centerX + Math.cos(angle) * baseRadius;
        const yStart = centerY + Math.sin(angle) * baseRadius;
        const xEnd = centerX + Math.cos(angle) * (baseRadius + scaleFactor * 15);
        const yEnd = centerY + Math.sin(angle) * (baseRadius + scaleFactor * 15);
  
        chaosDateLines.lineStyle(1.5, 0xFFFFFF, 1);
        chaosDateLines.moveTo(xStart, yStart).lineTo(xEnd, yEnd);
      }
    });
  }
  
  // --------------
  // The “updateData” function that gets called by toggleDevice()
  // --------------
  function updateData(device) {
    // Filter using the globally loaded chaosData
    filteredData = chaosData.filter(d => d.device === device);
  
    if (filteredData.length === 0) {
      chaosParticles.removeChildren();
      currentTheta = [];
      return;
    }
  
    currentTheta = d3.range(0, 2 * Math.PI, (2 * Math.PI) / filteredData.length);
    drawChart();
  }
  
  // --------------
  // The animation loop
  // --------------
  function animate() {
    chaosParticles.children.forEach((particle, i) => {
      const r = baseRadius + filteredData[i].avg_delta * scaleFactor + Math.sin(t / 4 + i / 10);
      particle.x = centerX + Math.cos(currentTheta[i]) * r;
      particle.y = centerY + Math.sin(currentTheta[i]) * r;
    });
    chaosApp.renderer.render(chaosApp.stage);
    t++;
    requestAnimationFrame(animate);
  }
  
  // ===========================
  // Chaos Wheel DOMContentLoaded
  // ===========================
  document.addEventListener("DOMContentLoaded", () => {
    const block2 = document.querySelector('.block-2');
  
    // Create PIXI app
    chaosApp = new PIXI.Application({
      width:  block2.offsetWidth,
      height: block2.offsetHeight,
      backgroundColor: 0x323447,
      antialias: true
    });
    block2.appendChild(chaosApp.view);
  
    // Create global containers 
    chaosParticles = new PIXI.Container();
    chaosDateLines = new PIXI.Graphics();
    chaosApp.stage.addChild(chaosDateLines);
    chaosApp.stage.addChild(chaosParticles);
  
    // Handle resizes
    window.addEventListener("resize", updateCanvasSize);
    updateCanvasSize();
  
    // Load chaos_wheel data globally
    d3.json("chaos_wheel.json").then(loadedData => {
      chaosData = loadedData;  // store in global
      // Fix the line below: was "const dates = data.map(...)"
      const dates = chaosData.map(d => new Date(d.date)); 
      startDate = new Date(Math.min(...dates));
      endDate   = new Date(Math.max(...dates));
      totalDays = (endDate - startDate) / (24 * 60 * 60 * 1000);
  
      // Kick off an initial device + animation
      updateData(currentDevice);
      animate();
    });
  });
  
  function updateCanvasSize() {
    const block2 = document.querySelector('.block-2');
    const width  = block2.offsetWidth * 0.95;
    const height = block2.offsetHeight * 0.90;
    chaosApp.renderer.resize(width, height);
  
    centerX = width / 2;
    centerY = height / 2;
  
    // Redraw if data already loaded
    drawChart();
  }


// Define updateCategoryData in global or higher scope
function updateCategoryData() {
    document.dispatchEvent(
        new CustomEvent("categoryFilterChange", {
            detail: { category: activeCategory },
        })
    );
    console.log(`Active category: ${activeCategory}`);
}

// Load data for search features
document.addEventListener("DOMContentLoaded", () => {
    d3.json("search_feature_summary.json")
        .then(data => {
            searchFeaturesData = data;

            // Populate the chart on load
            createSearchFeaturesChart(
                "#search-features-chart",
                searchFeaturesData,
                currentDevice,
                activeCategory
            );
        })
        .catch(error => {
            console.error("Error loading search_feature_summary.json:", error);
        });
});

// Update on filter changes
document.addEventListener('filterChange', e => {
    createSearchFeaturesChart(
        "#search-features-chart",
        searchFeaturesData,
        e.detail.device,
        activeCategory
    );
});

document.addEventListener('categoryFilterChange', e => {
    createSearchFeaturesChart(
        "#search-features-chart",
        searchFeaturesData,
        currentDevice,
        e.detail.category
    );
});



// Category filtereing and styling blocks
document.addEventListener("DOMContentLoaded", () => {
    const categories = [
        "Overall",
        "Cloud Computing",
        "Fashion",
        "Holidays",
        "Pets",
        "Reviews",
        "Shopping"
    ];

    const buttonContainer = document.getElementById("category-buttons-container");

    // Dynamically generate buttons
    categories.forEach(category => {
        const button = document.createElement("button");
        button.classList.add("category-button");
        button.dataset.category = category;
        button.textContent = category;

        // Add click event listener for single-select logic
        button.addEventListener("click", () => {
            if (activeCategory === category) return; // Skip redundant clicks
        
            // Reset styles for all buttons
            const allButtons = document.querySelectorAll(".category-button");
            allButtons.forEach(btn => {
                btn.style.backgroundColor = "#E85E76"; // Deselected style
                btn.style.color = "white";
            });
        
            // Apply styles to the selected button
            button.style.backgroundColor = "#f6b53d"; // Selected style
            button.style.color = "#323447";
        
            // Update the active category
            activeCategory = category;
            updateCategoryData();
        });
        

        // Append button to the container
        buttonContainer.appendChild(button);

        // Set default selected button style for "Overall"
        if (category === "Overall") {
            button.style.backgroundColor = "#f6b53d"; // Selected style
            button.style.color = "#323447";
        } else {
            button.style.backgroundColor = "#E85E76"; // Deselected style
            button.style.color = "white";
        }

        // Add common styles
        button.style.border = "none";
        button.style.padding = "10px 15px";
        button.style.margin = "0 5px";
        button.style.borderRadius = "5px";
        button.style.cursor = "pointer";
    });
});

function toggleDevice() {
    currentDevice = currentDevice === "Desktop" ? "Mobile" : "Desktop";
    document.dispatchEvent(new CustomEvent('filterChange', { detail: { device: currentDevice } }));
    document.getElementById('toggle-control').innerText = `Current Device: ${currentDevice}`;

    createFluxChart(".block-1", "flux_data.json", currentDevice, googleUpdates); // Correct
    updateTables();
    updateData(currentDevice);
}

function updateTables() {
    const activeCategories = new Set([...document.querySelectorAll('.category-button')]
        .filter(btn => btn.style.backgroundColor === "rgb(246, 181, 61)") // Button is active
        .map(btn => btn.dataset.category)
    );

    // Update Top Winners Table
    const winnersTableBody = document.getElementById("top-winners-table-body");
    winnersTableBody.innerHTML = ""; // Clear existing rows
    const filteredWinners = winnersData.filter(row => 
        row.device === currentDevice && activeCategories.has(row.keyword_category)
    );
    filteredWinners.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${row.domain}</td>
            <td>${row.point_change}</td>
            <td>${row.percent_change}</td>
        `;
        winnersTableBody.appendChild(tr);
    });

    // Update Top Losers Table
    const losersTableBody = document.getElementById("top-losers-table-body");
    losersTableBody.innerHTML = ""; // Clear existing rows
    const filteredLosers = losersData.filter(row => 
        row.device === currentDevice && activeCategories.has(row.keyword_category)
    );
    filteredLosers.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${row.domain}</td>
            <td>${row.point_change}</td>
            <td>${row.percent_change}</td>
        `;
        losersTableBody.appendChild(tr);
    });
}
// Data and chart population on load
document.addEventListener("DOMContentLoaded", () => {
    // Load data from JSON files and initialize tables
    Promise.all([
        fetch("top_winners.json").then(response => {
            if (!response.ok) throw new Error("Failed to load top_winners.json");
            return response.json();
        }),
        fetch("top_losers.json").then(response => {
            if (!response.ok) throw new Error("Failed to load top_losers.json");
            return response.json();
        })
    ])
    .then(([loadedWinners, loadedLosers]) => {
        winnersData = loadedWinners;
        losersData = loadedLosers;

        // Set default device and populate the initial tables
        currentDevice = "Mobile";
        document.getElementById('toggle-control').innerText = `Current Device: ${currentDevice}`;
        createFluxChart(".block-1", "flux_data.json", currentDevice, googleUpdates);

        updateData(currentDevice);
        updateTables();
        
    })
    .catch(error => console.error("Error loading data:", error));

    // Add event listener for the toggle button
    document.getElementById('toggle-control').addEventListener('click', toggleDevice);

    // Fetching top winnners
    fetch("top_winners.json")
    .then(response => {
        if (!response.ok) throw new Error("Failed to load top_winners.json");
        return response.json();
    })
    .then(data => {
        const tableBody = document.getElementById("top-winners-table-body");
        data.forEach(row => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${row.domain}</td>
                <td>${row.point_change}</td>
                <td>${row.percent_change}</td>
            `;
            tableBody.appendChild(tr);
        });
    })
    .catch(error => console.error("Error loading data:", error));

    // Fetching top losers 
    fetch("top_losers.json")
    .then(response => {
        if (!response.ok) throw new Error("Failed to load top_losers.json");
        return response.json();
    })
    .then(data => {
        const tableBody = document.getElementById("top-losers-table-body");
        data.forEach(row => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${row.domain}</td>
                <td>${row.point_change}</td>
                <td>${row.percent_change}</td>
            `;
            tableBody.appendChild(tr);
        });
    })
    .catch(error => console.error("Error loading data:", error));

});

// Filter change event listener
document.addEventListener('filterChange', e => {
    createFluxChart(".block-1", "flux_data.json", e.detail.device, googleUpdates);
    updateTables();
});

// Listen for device or category filter changes
document.addEventListener('filterChange', e => {
    console.log(`Device filter applied: ${e.detail.device}`);
    updateCategoryData(); // Reapply filters when device changes
});
document.addEventListener('categoryFilterChange', e => {
    const activeCategory = e.detail.category; // Get the single selected category
    createFluxChart(".block-1", "flux_data.json", currentDevice, googleUpdates, activeCategory);
    updateTables();
});

// Flux Chart Scripting
function createFluxChart(containerSelector, dataUrl, deviceFilter, googleUpdates) {
    const margin = { top: 5, right: 30, bottom: 70, left: 30 };
    const container = document.querySelector(containerSelector);

    if (!container) {
        console.error(`Container '${containerSelector}' not found.`);
        return;
    }

    const width = container.offsetWidth - margin.left - margin.right;
    const height = container.offsetHeight - margin.top - margin.bottom;

    const svg = d3.select(container).select("svg");
    if (svg.empty()) {
        d3.select(container).append("svg")
            .attr("width", container.offsetWidth)
            .attr("height", container.offsetHeight)
            .attr("viewBox", `0 0 ${container.offsetWidth} ${container.offsetHeight}`)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
    }

    const g = svg.select("g");
    const x = d3.scaleTime().range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);
    const parseDate = d3.timeParse("%Y-%m-%d");
    const tooltip = d3.select('.tooltip');

    // Fetch and process the data
    d3.json(dataUrl).then(data => {
        // Get active categories
        const activeCategories = new Set([...document.querySelectorAll('.category-button')]
            .filter(btn => btn.style.backgroundColor === "rgb(246, 181, 61)") // Button is active
            .map(btn => btn.dataset.category)
        );
    
        // Filter data based on device and active categories
        const filteredData = data.filter(d => 
        d.device === deviceFilter && activeCategories.has(d.keyword_category)
        );

        if (filteredData.length === 0) {
            console.warn("No data available for the selected filters.");
            return;
        }
    
        filteredData.forEach(d => {
            d.date = parseDate(d.date);
            d.scaled_flux_score = +d.scaled_flux_score;
        });

        const globalMaxY = d3.max(filteredData, d => d.scaled_flux_score);
        const categories = Array.from(new Set(filteredData.map(d => d.keyword_category)));

        x.domain(d3.extent(filteredData, d => d.date));
        y.domain([0, globalMaxY]);

        // Render points for tooltip interaction
        const points = g.selectAll(".point").data(filteredData);
        points.enter()
            .append("circle")
            .attr("class", "point")
            .attr("cx", d => x(d.date))
            .attr("cy", d => y(d.scaled_flux_score))
            .attr("r", 5)
            .attr("fill", "rgba(246, 181, 61, 0.0)")
            .on("mouseover", (event, d) => {
                tooltip.style("display", "block")
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 20}px`)
                    .html(`
                        <strong>Date:</strong> ${d3.timeFormat("%b %d, %Y")(d.date)}<br>
                        <strong>Score:</strong> ${d.scaled_flux_score}<br>
                        <strong>Category:</strong> ${d.keyword_category}
                    `);
            })
            .on("mousemove", event => {
                tooltip.style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 20}px`);
            })
            .on("mouseout", () => {
                tooltip.style("display", "none");
            });

        points.transition()
            .duration(500)
            .attr("cx", d => x(d.date))
            .attr("cy", d => y(d.scaled_flux_score));

        points.exit().remove();

        // Render axes
        const xAxis = g.selectAll(".x-axis").data([null]);
        xAxis.enter()
            .append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${height})`)
            .merge(xAxis)
            .transition()
            .duration(500)
            .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%b %d")));

        const yAxis = g.selectAll(".y-axis").data([null]);
        yAxis.enter()
            .append("g")
            .attr("class", "y-axis")
            .merge(yAxis)
            .transition()
            .duration(500)
            .call(d3.axisLeft(y));

        const singleCategoryData = filteredData.filter(d => d.keyword_category === activeCategory);

        // Then do a single-data join:
        const area = g.selectAll(".area")
            .data([singleCategoryData]);  // <-- an array of length 1

        // EXIT
        area.exit()
            .transition().duration(500)
            .style("opacity", 0)
            .remove();

        // ENTER + UPDATE
        area.enter()
            .append("path")
            .attr("class", "area")
            .style("opacity", 0)         // start invisible
            .attr("fill", "rgba(246, 181, 61, 0.33)")
            .attr("stroke", "#F6B53D")
            .attr("stroke-width", 1)
            .merge(area)                 // merge the entering + updating selection
            .transition()
            .duration(500)
            .style("opacity", 1)
            .attr("d", d3.area()
                .x(d => x(d.date))
                .y0(y(0))
                .y1(d => y(d.scaled_flux_score))
                .curve(d3.curveBasis)
            );


        // Update Annotations (Google Updates)
        const annotations = g.selectAll(".annotation").data(googleUpdates, d => d.date);

        // Handle entering and updating annotation lines
        annotations.enter()
            .append("line")
            .attr("class", "annotation")
            .attr("x1", d => x(parseDate(d.date)))
            .attr("x2", d => x(parseDate(d.date)))
            .attr("y1", y(0))
            .attr("y2", y(globalMaxY))
            .attr("stroke", "#FFFFFF")
            .attr("stroke-dasharray", "4,2")
            .attr("stroke-width", 1)
            .merge(annotations)
            .transition()
            .duration(500)
            .attr("x1", d => x(parseDate(d.date)))
            .attr("x2", d => x(parseDate(d.date)))
            .attr("y2", y(globalMaxY));

        // Remove exiting annotation lines
        annotations.exit()
            .transition()
            .duration(500)
            .style("opacity", 0)
            .remove();

        // Update Annotation Labels (Google Update Names)
        const labels = g.selectAll(".annotation-label").data(googleUpdates, d => d.date);

        // Handle entering and updating labels
        labels.enter()
            .append("text")
            .attr("class", "annotation-label")
            .attr("x", d => x(parseDate(d.date)) - 10) // Adjust for positioning
            .attr("y", (d, i) => 10 + i * 15) // Stagger vertically to prevent overlap
            .text(d => d.name)
            .style("font-size", "10px")
            .style("fill", "white")
            .style("text-anchor", "end")
            .merge(labels)
            .transition()
            .duration(500)
            .attr("x", d => x(parseDate(d.date)) - 10)
            .attr("y", (d, i) => 10 + i * 15); // Adjust label positions smoothly

        // Remove exiting labels
        labels.exit()
            .transition()
            .duration(500)
            .style("opacity", 0)
            .remove();

        });
    }

// Making the search features chart
function createSearchFeaturesChart(containerSelector, data, deviceFilter, activeCategory) {
    const margin = { top: 20, right: 150, bottom: 30, left: 50 };
    const container = document.querySelector(containerSelector);

    if (!container) {
        console.error(`Container '${containerSelector}' not found.`);
        return;
    }

    const width = container.offsetWidth - margin.left - margin.right;
    const height = container.offsetHeight - margin.top - margin.bottom;

    // Clear existing content
    d3.select(container).selectAll("*").remove();

    const svg = d3.select(container).append("svg")
        .attr("width", container.offsetWidth)
        .attr("height", container.offsetHeight);

    const chartGroup = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime().range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);
    const parseDate = d3.timeParse("%Y-%m-%d");
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Filter and validate data
    const filteredData = data.filter(d =>
        d.device === deviceFilter &&
        d.keyword_category === activeCategory &&
        d.date // Ensure the date property exists
    ).map(d => {
        d.date = parseDate(d.date); // Parse the date
        d.total_points = +d.total_points; // Convert total_points to numeric
        return d;
    }).filter(d => d.date !== null); // Ensure parsed dates are valid
    if (!filteredData.length) {
        console.warn("No data available for the selected filters.");
        return;
    }

    // Group data by search_feature
    const features = d3.groups(filteredData, d => d.search_feature);

    // Set domains
    x.domain(d3.extent(filteredData, d => d.date));
    y.domain([0, d3.max(filteredData, d => d.total_points)]);
    color.domain(features.map(f => f[0])); // Assign a color to each feature

    // Draw axes
    chartGroup.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%b %d")));

    chartGroup.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y));

    // Draw lines for each search_feature
    features.forEach(([feature, values]) => {
        chartGroup.append("path")
            .datum(values)
            .attr("class", "line")
            .style("fill", "none")
            .style("stroke", color(feature))
            .style("stroke-width", 2)
            .attr("d", d3.line()
                .x(d => x(d.date))
                .y(d => y(d.total_points))
                .curve(d3.curveBasis)
            );
    });

    // Create a legend container outside the chart area
    const legendContainer = svg.append("g")
        .attr("class", "legend-container")
        .attr("transform", `translate(${width + margin.left + 10},${margin.top})`);

    // Append legend items
    const legendItems = legendContainer.selectAll(".legend-item")
        .data(features)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`);

    legendItems.append("rect")
        .attr("x", 0)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", d => color(d[0]));

    legendItems.append("text")
        .attr("x", 25)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("fill", "white")
        .style("font-size", "12px")
        .text(d => d[0]);
}

// Making our top domains chart
document.addEventListener("DOMContentLoaded", () => {
    // 1. Find the container
    const container = document.querySelector("#top_domains_chart");

    // 2. Determine the container’s size
    //    (assuming you set .row-4 .block or #top_domains_chart { height: 400px; } in CSS)
    const containerWidth  = container.clientWidth;
    const containerHeight = container.clientHeight; // should be 400 if that’s what your CSS says

    // 3. Define margins
    const topDomainsMargin = { top: 0, right: 170, bottom: 90, left: 50 };

    // 4. Derive the inner drawing area
    const topDomainsWidth  = containerWidth  - topDomainsMargin.left - topDomainsMargin.right;
    const topDomainsHeight = containerHeight - topDomainsMargin.top  - topDomainsMargin.bottom;

    // 5. Create the SVG (using the container’s full width & height)
    const topDomainsSvg = d3.select(container)
      .append("svg")
        .attr("width",  containerWidth)
        .attr("height", containerHeight)
      .append("g")
        .attr("transform", `translate(${topDomainsMargin.left},${topDomainsMargin.top})`);

    const topDomainsTooltip = d3.select(".tooltip");
    // Scales
    const topDomainsXScale = d3.scaleTime().range([0, topDomainsWidth]);
    const topDomainsYScale = d3.scaleLinear().range([topDomainsHeight, 0]);


    // Axes
    const topDomainsXAxis = d3.axisBottom(topDomainsXScale);
    const topDomainsYAxis = d3.axisLeft(topDomainsYScale);

    topDomainsSvg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${topDomainsHeight})`);

    topDomainsSvg.append("g")
      .attr("class", "y-axis");

    // Line generator
    const topDomainsLine = d3.line()
      .x(d => topDomainsXScale(new Date(d.date)))
      .y(d => topDomainsYScale(d.domain_points));

    let topDomainsData;
    // let topDomainsGroupedData; // Already declare globally in scripts.js

    function updateTopDomainsChart() {
        // Filter data by current device and active category
        const filteredTopDomainsData = topDomainsData.filter(
        d => d.device === currentDevice && d.keyword_category === activeCategory
        );

        // Group data by domain and store globally
        topDomainsGroupedData = d3.group(filteredTopDomainsData, d => d.domain);

        // Compute total points per domain, then sort descending
        const domainSums = [];
        topDomainsGroupedData.forEach((points, domain) => {
            const total = d3.sum(points, d => d.domain_points);
            domainSums.push({ domain, total });
        });
        domainSums.sort((a, b) => b.total - a.total);

        // Store the number of domains we have to work out how many colours we want
        const sortedDomains = domainSums.map(d => d.domain);

        // Use a sequential color scale based on each domain’s index
        const colorSequential = d3.scaleSequential(
            t => d3.interpolateWarm(1 - t)
        )
        .domain([0, sortedDomains.length - 1]);

        // Legend creation
        // 1) Select or create the legend group
        let legendGroup = topDomainsSvg.select(".legend-group");
        if (legendGroup.empty()) {
        legendGroup = topDomainsSvg.append("g")
            .attr("class", "legend-group")
            // Shift legend to the right side of the chart area
            .attr("transform", `translate(${topDomainsWidth + 10}, 20)`);
        }

        // 2) Join the sortedDomains to legend "item" groups
        const legendItems = legendGroup.selectAll(".legend-item")
        .data(sortedDomains, d => d);

        // ENTER phase
        const legendEnter = legendItems.enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`);

        // Each new item: add a small colour rectangle
        legendEnter.append("rect")
        .attr("width", 12)
        .attr("height", 12)

        // Also add text next to it
        legendEnter.append("text")
        .attr("x", 18)
        .attr("y", 10)
        .attr("fill", "white")
        .style("font-size", "12px");

        // UPDATE + ENTER merged
        const legendUpdate = legendItems.merge(legendEnter)
            .attr("transform", (d, i) => `translate(0, ${i * 20})`);

        // -- HERE is the key part:
        legendUpdate.select("rect")
            .attr("fill", (d, i) => colorSequential(i));

        legendUpdate.select("text")
            .text(d => {
            const maxChars = 15;
            return d.length > maxChars ? d.slice(0, maxChars) + "…" : d;
            });
        // EXIT phase
        legendItems.exit().remove();

        // Flatten and calculate extent
        const flatData = filteredTopDomainsData.map(d => ({
        date: new Date(d.date),
        domain_points: d.domain_points,
        }));
        topDomainsXScale.domain(d3.extent(flatData, d => d.date));
        topDomainsYScale.domain([0, d3.max(flatData, d => d.domain_points)]);

        // Dashed white lines
        const updatesSelection = topDomainsSvg.selectAll(".google-update-line")
            .data(googleUpdates, d => d.date);

        updatesSelection.enter()
        .append("line")
        .attr("class", "google-update-line")
        .attr("stroke", "white")
        .attr("stroke-dasharray", "3,2")
        .attr("stroke-width", 2)
        .merge(updatesSelection)
        .attr("x1", d => topDomainsXScale(new Date(d.date)))
        .attr("y1", 0)
        .attr("x2", d => topDomainsXScale(new Date(d.date)))
        .attr("y2", topDomainsHeight);

        updatesSelection.exit().remove();

        // Labels to the left, staggered vertically
        const updateLabels = topDomainsSvg.selectAll(".google-update-label")
        .data(googleUpdates, d => d.date);

        updateLabels.enter()
        .append("text")
        .attr("class", "google-update-label")
        .attr("fill", "white")
        .style("font-size", "10px")
        .style("text-anchor", "end")   // Align text right
        .merge(updateLabels)
        .attr("x", d => topDomainsXScale(new Date(d.date)) - 5)
        .attr("y", (d, i) => 10 + i * 15) // Stagger labels by 15px
        .text(d => d.name);

        updateLabels.exit().remove();


        // Update axes
        topDomainsSvg.select(".x-axis").call(topDomainsXAxis);
        topDomainsSvg.select(".y-axis").call(topDomainsYAxis);

        // Update lines
        const lines = topDomainsSvg.selectAll(".line").data([...topDomainsGroupedData], d => d[0]);

        lines
        .enter()
        .append("path")
        .attr("class", "line")
        .merge(lines)
        .attr("d", d => topDomainsLine(d[1]))
        .attr("stroke", d => {
            const i = sortedDomains.indexOf(d[0]); // d[0] is the domain name
            return colorSequential(i);
        })
        .style("fill", "none")
        .style("stroke-width", 2);

    lines.exit().remove();
    }

    // Tooltip interaction
    topDomainsSvg
        .append("rect")
        .attr("class", "overlay")
        .attr("width", topDomainsWidth)
        .attr("height", topDomainsHeight)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mousemove", function (event) {
            const [mouseX, mouseY] = d3.pointer(event, this);
            const x0 = topDomainsXScale.invert(mouseX);
            // If we also want y in data terms:
            const y0 = topDomainsYScale.invert(mouseY);

            let closestPoint = null;
            let closestDomain = null;
            let minDistance = Infinity;

            topDomainsGroupedData.forEach((points, domain) => {
                // Ensure points are sorted by date
                // Then find index of nearest date in the domain’s data:
                const index = d3.bisector(d => new Date(d.date)).left(points, x0, 1);
                const d0 = points[index - 1];
                const d1 = points[index];
                const candidate = d1 && (!d0 || x0 - new Date(d0.date) > new Date(d1.date) - x0)
                                    ? d1
                                    : d0;

                if (candidate) {
                const px = topDomainsXScale(new Date(candidate.date));
                const py = topDomainsYScale(candidate.domain_points);
                const dx = px - mouseX;
                const dy = py - mouseY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint = candidate;
                    closestDomain = domain;
                }
                }
            });

            // Update tooltip if a closest point is found
            if (closestPoint) {
                topDomainsTooltip
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 20}px`)
                    .style("display", "block")
                    .html(`
                        <strong>Domain: ${closestDomain}</strong><br>
                        Date: ${d3.timeFormat("%Y-%m-%d")(new Date(closestPoint.date))}<br>
                        Points: ${closestPoint.domain_points}
                    `);

                // Highlight the closest point
                topDomainsSvg.selectAll(".highlight-circle").remove(); // Clear previous highlights
                topDomainsSvg.append("circle")
                    .attr("class", "highlight-circle")
                    .attr("cx", topDomainsXScale(new Date(closestPoint.date)))
                    .attr("cy", topDomainsYScale(closestPoint.domain_points))
                    .attr("r", 5)
                    .style("fill", "white");
            }
        })
        .on("mouseout", () => {
            topDomainsTooltip.style("display", "none");
            topDomainsSvg.selectAll(".highlight-circle").remove();
        });



    // Load the data
    d3.json("top_domains.json").then(data => {
        topDomainsData = data; // Store data globally
        updateTopDomainsChart(); // Render the initial chart

        // Add event listeners for filter and category changes
        document.addEventListener('filterChange', () => updateTopDomainsChart());
        document.addEventListener('categoryFilterChange', () => updateTopDomainsChart());
    });
});