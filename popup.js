let poNumber = "PO_Unknown"; // Initialize PO number
let poDate = "Date Unknown"; // Initialize PO date
let filteredDataGlobal = []; // Initialize a global variable for the filtered data

// When the DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  const loader = document.getElementById("loader");
  const tableContainer = document.getElementById("preview-table-container");
  const downloadButton = document.getElementById("download");

  // Show loader when fetching data
  loader.style.display = "block";
  tableContainer.style.display = "none"; // Hide table initially
  downloadButton.disabled = true; // Disable the download button

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab && tab.url && tab.url.includes("shopify.com")) {
    try {
      // Inject and execute script to extract PO number and PO date
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          function: extractPoInfo, // Self-contained function
        },
        (results) => {
          if (results && results[0].result) {
            poNumber = results[0].result.poNumber || "PO_Unknown";
            poDate = results[0].result.poDate || "Date Unknown";

            document.getElementById(
              "message"
            ).innerHTML = `PO Number: ${poNumber} <br> PO Date: ${poDate}`;
          } else {
            document.getElementById("message").innerHTML =
              "PO Number: Not Found<br>PO Date: Not Found";
          }

          // Proceed with data extraction and table population
          chrome.scripting.executeScript(
            {
              target: { tabId: tab.id },
              function: getFilteredHtmlContent,
            },
            (results) => {
              loader.style.display = "none"; // Hide loader once data is fetched

              if (results && results[0] && results[0].result) {
                filteredDataGlobal = results[0].result;
                if (
                  Array.isArray(filteredDataGlobal) &&
                  filteredDataGlobal.length > 0
                ) {
                  populatePreviewTable(filteredDataGlobal);
                  tableContainer.style.display = "block"; // Show table
                  downloadButton.disabled = false; // Enable download button
                } else {
                  document.getElementById(
                    "message"
                  ).innerHTML += `<div class="error">No relevant data found.</div>`;
                }
              } else {
                document.getElementById(
                  "message"
                ).innerHTML += `<div class="error">No HTML content returned.</div>`;
              }
            }
          );
        }
      );
    } catch (error) {
      loader.style.display = "none"; // Hide loader if an error occurs
      console.error("Error executing script:", error);
      document.getElementById(
        "message"
      ).innerHTML = `<div class="error">An unexpected error occurred. Please try again.</div>`;
    }
  } else {
    loader.style.display = "none"; // Hide loader if not on a valid Shopify page
    document.getElementById(
      "message"
    ).innerHTML = `<div class="error">This extension only works on Shopify Purchase Order pages.</div>`;
  }
});


// Self-contained function to extract PO number and date (content script)
function extractPoInfo() {
  // Function to extract the PO number from the Shopify page
  const getPurchaseOrderNumber = () => {
    // Try the new selector first (h1 inside page title div)
    const poNumberElement = document.querySelector(
      "#page-title h1, .Polaris-Breadcrumbs__PageTitle h1"
    );
    
    if (poNumberElement) {
      const poText = poNumberElement.textContent.trim();
      const poNumberMatch = poText.match(/#PO\d+/); // Regex to match "#PO" followed by numbers
      return poNumberMatch ? poNumberMatch[0] : poText;
    } 
    
    // Fallback to older selector just in case
    const oldPoElement = document.querySelector(
      "span.Polaris-Text--headingLg.Polaris-Text--bold"
    );
    if (oldPoElement) {
       const poText = oldPoElement.textContent.trim();
       const poNumberMatch = poText.match(/#PO\d+/);
       return poNumberMatch ? poNumberMatch[0] : "PO_Unknown";
    }

    return "PO_Unknown";
  };

  const getPurchaseOrderDate = () => {
    // Search strategy: Look for elements with text "Estimated arrival"
    // This covers both <label> (Draft) and <s-internal-text> (Closed)
    
    // Helper to traverse and find the text
    const xpath = "//*[contains(text(), 'Estimated arrival')]";
    const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    
    for (let i = 0; i < result.snapshotLength; i++) {
        const el = result.snapshotItem(i);
        
        // Skip if it's a script or style
        if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;

        // CHECK 1: Closed PO style (Text inside a container, value in sibling p)
        // Structure: div.Polaris-TextContainer > s-internal-text + p
        const container = el.closest(".Polaris-TextContainer");
        if (container) {
            const p = container.querySelector("p");
            if (p && p.innerText) return p.innerText.trim();
        }

        // CHECK 2: Draft PO style (Label > (traverse) > Input)
        if (el.tagName === 'LABEL') {
             let wrapper = el.closest(".Polaris-Labelled__LabelWrapper");
              if (wrapper && wrapper.nextElementSibling) {
                const input = wrapper.nextElementSibling.querySelector("input");
                if (input && input.value) return input.value.trim();
              }
              // Fallback for older drafts
              if (el.parentElement && el.parentElement.parentElement && el.parentElement.parentElement.nextElementSibling) {
                  const input = el.parentElement.parentElement.nextElementSibling.querySelector("input");
                  if (input && input.value) return input.value.trim();
              }
        }
    }

    return "Date Unknown"; // Default return value if no date is found
  };

  return {
    poNumber: getPurchaseOrderNumber(),
    poDate: getPurchaseOrderDate(),
  };
}

// Function to extract and filter HTML content from the Shopify PO page
function getFilteredHtmlContent() {
  const rows = document.querySelectorAll("tr");
  let similarRows = [];
  let rowCounter = 1; // Start the row counter from 1

  rows.forEach((row) => {
    // Check if row class starts with _PurchaseOrderLineItem_ or contains it
    if (row.className && typeof row.className === 'string' && row.className.includes("_PurchaseOrderLineItem_")) {
      // Image: Check s-thumbnail src first, then fallback to img src
      let thumbnail = "N/A";
      const sThumbnail = row.querySelector("s-thumbnail");
      if (sThumbnail && sThumbnail.getAttribute("src")) {
          thumbnail = sThumbnail.getAttribute("src");
      } else {
          thumbnail = row.querySelector("img")?.src || "N/A";
      }

      // Title: Look for cell with class containing _ItemDetails_
      let title = "N/A";
      const titleCell = row.querySelector("td[class*='_ItemDetails_']");
      if (titleCell) {
          title = titleCell.querySelector("a.Polaris-Link")?.innerText || titleCell.innerText || "N/A";
      }

      // Quantity: Look for cell with class containing _Received_
      // Draft PO: <input value="...">
      // Closed PO: Text "10 of 10" (Received of Ordered)
      let quantity = "0";
      const qtyCell = row.querySelector("td[class*='_Received_']");
      if (qtyCell) {
          const input = qtyCell.querySelector("input");
          if (input) {
              quantity = input.value;
          } else {
              // Extract text, potentially "X of Y"
              const text = qtyCell.innerText || "";
              const ofMatch = text.match(/(\d+)\s+of\s+(\d+)/);
              if (ofMatch) {
                  // If "X of Y" format, assume Y is the ordered quantity
                  quantity = ofMatch[2]; 
              } else {
                  // Fallback to simple parse
                  quantity = text;
              }
          }
      }
      quantity = parseInt(quantity, 10); 
      if (isNaN(quantity)) quantity = 0;

      // Unit Price: Look for cell with class containing _Cost_
      // Draft PO: <input value="...">
      // Closed PO: Text "Rs 400.00"
      let unitPrice = "0";
      const costCell = row.querySelector("td[class*='_Cost_']");
      if (costCell) {
          const input = costCell.querySelector("input");
          if (input) {
              unitPrice = input.value;
          } else {
              unitPrice = costCell.innerText || "0";
          }
      }
      unitPrice = parseFloat(unitPrice.replace(/[^\d.-]/g, "")); 
      if (isNaN(unitPrice)) unitPrice = 0.00;

      // Calculate total price (unit price * quantity)
      let total = (quantity * unitPrice).toFixed(2); // Ensure two decimal places

      // Push row data
      similarRows.push([
        rowCounter, // Use the counter instead of index
        thumbnail,
        title,
        quantity,
        unitPrice.toFixed(2), // Format unit price with two decimals
        total, // Total price
      ]);

      rowCounter++; // Increment the counter for the next row
    }
  });

  return similarRows;
}

// Function to populate the preview table with the provided data
function populatePreviewTable(data) {
  const tableBody = document.querySelector("#preview-table tbody");
  const tableContainer = document.getElementById("preview-table-container");

  tableBody.innerHTML = ""; // Clear existing content

  if (Array.isArray(data) && data.length > 0) {
    // Show the table and header if data exists
    tableContainer.style.display = "block"; // Show the table container

    data.forEach((row) => {
      const tr = document.createElement("tr");

      row.forEach((cell, index) => {
        const td = document.createElement("td");
        if (index === 1 && cell !== "N/A") {
          const img = document.createElement("img");
          img.src = cell;
          img.alt = "Product Image";
          img.width = 50;
          td.appendChild(img);
        } else {
          td.innerHTML = cell || "N/A";
        }
        tr.appendChild(td);
      });
      tableBody.appendChild(tr);
    });
  } else {
    console.error("Invalid data format for preview table or no data.");
    tableContainer.style.display = "none"; // Hide the table if no data
  }
}

// Function to handle formatting for the worksheet
function formatWorksheet(worksheet, totalRowIndex) {
  // After adding data, set the default font to Arial and size 12 for the entire sheet
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 12 };
    });
  });

  // Merge the first row (A1 to F1)
  worksheet.mergeCells("A1:F1");

  // Center-align all text in the worksheet
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      cell.alignment = {
        wrapText: true,
        vertical: "middle",
        horizontal: "center",
      };
    });
  });

  // Set font for the merged first row and increase its size to 16
  worksheet.getCell("A1").font = { name: "Arial", size: 16 };

  // Enable text wrapping and set alignment for the merged first row
  worksheet.getCell("A1").alignment = {
    wrapText: true,
    vertical: "bottom",
    horizontal: "right",
  };

  // Set text color to white, background color to #00B8DC, and add borders for the second row
  worksheet.getRow(2).eachCell((cell) => {
    cell.font = { color: { argb: "FFFFFFFF" }, size: 12, name: "Arial" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF00B8DC" }, // Background color
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Set width of columns A - F
  worksheet.getColumn("A").width = 6;
  worksheet.getColumn("B").width = 15;
  worksheet.getColumn("C").width = 30;
  worksheet.getColumn("D").width = 10;
  worksheet.getColumn("E").width = 13;
  worksheet.getColumn("F").width = 13;

  // Set the height of row 1 to 90
  worksheet.getRow(1).height = 90;
  // Set the height of row 2 to 30
  worksheet.getRow(2).height = 30;

  // Set font size to 12, Arial, and bold for the entire total row
  worksheet.getRow(totalRowIndex).eachCell((cell) => {
    cell.font = { name: "Arial", size: 12, bold: true };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Set the height of the total row to 30
  worksheet.getRow(totalRowIndex).height = 30;
}

// Listen to the download button click event to generate the Excel file using ExcelJS
document.getElementById("download").addEventListener("click", async () => {
  // Show loader
  const loader = document.getElementById("loader");
  loader.style.display = "block";

  try {
    // Check if filteredDataGlobal has data to export
    if (!filteredDataGlobal.length) {
      alert("No data to export.");
      return;
    }

    // Create a new Excel workbook
    console.log("Creating new Excel Workbook...");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Table 1");

    // Force Excel to recalculate all formulas when the file is opened
    workbook.calcProperties.fullCalcOnLoad = true;

    // Add PO Number and Date in the first row with a new line between them
    console.log("Adding PO Number and Date...");
    worksheet.getCell("A1").value = `${poNumber || "PO_Unknown"}\n${poDate || "Date Unknown"}`;

    // Add Item Headers in the second row
    console.log("Adding item headers...");
    worksheet.getRow(2).values = ["SR #", "IMAGE", "ITEM", "QTY", "Unit Price", "TOTAL"];

    // Add table rows from the filteredDataGlobal array
    filteredDataGlobal.forEach((row, index) => {
      const rowIndex = index + 3; // Start from row 3 after headers

      // Parse quantity and unit price
      const quantity = parseFloat(row[3]);
      const unitPrice = parseFloat(row[4]);

      // Add row data excluding the image
      worksheet.getCell(`A${rowIndex}`).value = row[0]; // Sr #
      worksheet.getCell(`A${rowIndex}`).border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };

      worksheet.getCell(`C${rowIndex}`).value = row[2]; // Title
      worksheet.getCell(`C${rowIndex}`).border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };

      worksheet.getCell(`D${rowIndex}`).value = quantity; // Quantity
      worksheet.getCell(`D${rowIndex}`).border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };

      worksheet.getCell(`E${rowIndex}`).value = unitPrice; // Unit Price
      worksheet.getCell(`E${rowIndex}`).border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };

      // Add formula with pre-calculated result for Total (column F)
      const total = quantity * unitPrice;
      worksheet.getCell(`F${rowIndex}`).value = { formula: `D${rowIndex}*E${rowIndex}`, result: total }; // Total (formula with pre-calculated result)
      worksheet.getCell(`F${rowIndex}`).border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };

      // Add placeholder for images and adjust row height
      if (row[1] !== "N/A") {
        console.log(`Adding placeholder for image at row ${rowIndex}...`);
        worksheet.getRow(rowIndex).height = 100; // Set row height to fit the image
      }
    });

    // Calculate the total row after data
    const totalRowIndex = filteredDataGlobal.length + 3; // Row after the last data row

    // Add sum formula with pre-calculated result for Quantity (column D)
    worksheet.getCell(`D${totalRowIndex}`).value = {
      formula: `SUM(D3:D${totalRowIndex - 1})`,
      result: filteredDataGlobal.reduce((sum, row) => sum + parseFloat(row[3]), 0),
    };
    worksheet.getCell(`D${totalRowIndex}`).font = { bold: true };
    worksheet.getCell(`D${totalRowIndex}`).border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };

    // Add sum formula with pre-calculated result for Total (column F)
    worksheet.getCell(`F${totalRowIndex}`).value = {
      formula: `SUM(F3:F${totalRowIndex - 1})`,
      result: filteredDataGlobal.reduce((sum, row) => sum + parseFloat(row[3]) * parseFloat(row[4]), 0),
    };
    worksheet.getCell(`F${totalRowIndex}`).font = { bold: true };
    worksheet.getCell(`F${totalRowIndex}`).border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };

    // Download images and embed them into the sheet
    await Promise.all(
      filteredDataGlobal.map(async (row, index) => {
        const imageUrl = row[1];
        if (imageUrl !== "N/A") {
          try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const extension = blob.type.split("/")[1]; // Get image extension

            // Add image to the Excel sheet
            const imageId = workbook.addImage({
              buffer: arrayBuffer,
              extension: extension,
            });

            // Embed the image into the worksheet in the correct column (B, column 2)
            const rowIndex = index + 2;
            worksheet.addImage(imageId, {
              tl: { col: 1, row: rowIndex }, // Position image in column 2 (Image column), adjust for rowIndex
              ext: { width: 100, height: 100 }, // Set image size
            });
          } catch (error) {
            console.error(`Failed to fetch or embed image from ${imageUrl}`, error);
          }
        }
      })
    );

    // After adding data, set the default font to Arial and size 12 for the entire sheet
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        cell.font = { name: "Arial", size: 12 };
      });
    });

    // Formatting
    // Merge the first row (A1 to F1)
    worksheet.mergeCells("A1:F1");

    // Center-align all text in the worksheet
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        cell.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
      });
    });

    // Set font for the merged first row and increase its size to 16
    worksheet.getCell("A1").font = { name: "Arial", size: 16 };

    // Enable text wrapping and set alignment
    worksheet.getCell("A1").alignment = { wrapText: true, vertical: "bottom", horizontal: "right" };

    // Set text color to white, background color to #00B8DC, and add borders for the second row
    worksheet.getRow(2).eachCell((cell) => {
      cell.font = { color: { argb: "FFFFFFFF" }, size: 12, name: "Arial" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF00B8DC" } }; // Background color
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });

    // Set width of columns A - F
    worksheet.getColumn("A").width = 6;
    worksheet.getColumn("B").width = 15;
    worksheet.getColumn("C").width = 30;
    worksheet.getColumn("D").width = 10;
    worksheet.getColumn("E").width = 13;
    worksheet.getColumn("F").width = 13;

    // Set the height of row 1 to 90
    worksheet.getRow(1).height = 90;
    // Set the height of row 2 to 30
    worksheet.getRow(2).height = 30;
    // Set font size to 12, Arial, and bold for the entire total row
    worksheet.getRow(totalRowIndex).eachCell((cell) => {
      cell.font = { name: "Arial", size: 12, bold: true };
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    });

    // Set the height of the total row to 30
    worksheet.getRow(totalRowIndex).height = 30;

    // Export Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

    // Trigger download
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${poNumber}.xlsx`;
    link.click();

    console.log("Excel file created and download triggered successfully.");
  } catch (error) {
    console.error("Error occurred:", error);
  } finally {
    // Hide loader
    loader.style.display = "none";
  }
});

