import axios from 'axios';
import { make, purge } from "./domUtils";

let selectedOlympics = "tokyo-2020";

const onInit = () => {
  document.addEventListener("change", handleSelectOnChange, false);
  getLocalDataOrServerData(selectedOlympics);
}

const getLocalDataOrServerData = (selectedOlympics) => {
  console.log(selectedOlympics);
  if (localStorage.getItem(`medalsTable-${selectedOlympics}`) !== null) {
    console.log("using local storage");
    showOverlay();
    checkOrPurge();
    let appEl = document.getElementById("app");
    let doc = new DOMParser().parseFromString(localStorage.getItem(`medalsTable-${selectedOlympics}`), "text/html");
    // console.log(doc);
    updateTitleText(selectedOlympics);
    appEl.append(doc.body.firstChild);
    hideOverlay();
  } else {
    console.log("Getting data");
    getOlympicData(selectedOlympics);
  }
}

const handleSelectOnChange = (event) => {
  let evtElement = event.target;
  selectedOlympics = evtElement.value;
  getLocalDataOrServerData(selectedOlympics);
};

const getOlympicData = async (query) => {
  console.log("Get Olmpic data", query);
  try {
    showOverlay();
    const rawData = await axios(`/table?games=${query}`, {
      method: "GET",
    });
    checkOrPurge();
    handleRawData(rawData);
    hideOverlay();   
  } catch (error) {
    console.log(error);
  }
}

const handleRawData = (rawData) => {
  console.log(rawData);
  
  let tableData = JSON.parse(rawData.data.data);
  
  let { title, html } = tableData;
  
  console.log("Title", title);
  
  document.querySelector("#app h1").textContent = `${title.toUpperCase()} Medals Table`;
  
  let doc = new DOMParser().parseFromString(html, "text/html");
  
  console.log(doc);
  
  let medalData;
  
  if (title.toLowerCase() === "tokyo 2020") {
    medalData = buildBBBCData(doc);
  } else {
    medalData = buildOlympicData(doc);
  }
  
  // #########################################
  // Build Table
  buildTable(medalData);
  
  // Save to local storage
  let data = document.querySelector(".medal-table");
  localStorage.setItem(`medalsTable-${selectedOlympics}`, data.outerHTML);
}

// fieldSorter function sorts an object list, by the passed in fields
function fieldSorter(fields) {
  return function (a, b) {
    return fields
      .map(function (o) {
        var dir = 1;
        if (o[0] === "-") {
          dir = -1;
          o = o.substring(1);
        }
        if (a[o] > b[o]) return dir;
        if (a[o] < b[o]) return -dir;
        return 0;
      })
      .reduce(function firstNonZeroValue(p, n) {
        return p ? p : n;
      }, 0);
  };
}

const buildBBBCData = (htmlDoc) => {
  let rowCells = [];
  const allRows = htmlDoc.querySelectorAll(".story-body__table tbody tr");
  allRows.forEach(row => {
    let tempArray = []
    let tempAllCells = row.querySelectorAll("td");
    tempArray = Array.prototype.map.call(tempAllCells, (cell) => cell.textContent);
    rowCells.push(tempArray); 
  });
  
  const elTextObjs = rowCells.map(([pos, country, gold, silver, bronze, total]) => ({pos, country, gold, silver, bronze, total}));

  return elTextObjs;
}

const buildOlympicData = (htmlDoc) => {  
  let allDivs = htmlDoc.querySelectorAll("div[data-cy='table-content'] > div:not([class='line'])");  
  // Get text content from the divs and divide into country arrays
  let elTextArray = [];
  let len = allDivs.length;
  let guvenor = 0;
  let tmpArray = [];
  console.time("loopDivs")
  // Start loop
  for (var i = 0; i < len; i++) {
    let current = allDivs[i];
    if (guvenor !== 0 && guvenor !== 6) {
      if (guvenor === 1) {
        let text = current.textContent;
        let countryCode = text.substring(0, 3);
        let countryName = text.substring(4);
        tmpArray.push(countryCode);
        tmpArray.push(countryName);
      } else {
        let val = current.textContent.replace(/-/, "0");
        //console.log(val);
        if (!isNaN(val)) {
          tmpArray.push(+val);
        } else {
          tmpArray.push(val);
        }
      }
      if (tmpArray.length === 6) {
        let mapArr = [...tmpArray];
        elTextArray.push(mapArr);
        tmpArray.length = 0;
      }
    }
    guvenor++;
    guvenor > 6 ? guvenor = 0 : null;
  }
  
  // Convert arrays into objects with supplied keys
  const elTextObjs = elTextArray.map(([code, country, gold, silver, bronze, total]) => ({code, country, gold, silver, bronze, total}));
  
  elTextObjs.sort(fieldSorter(["-gold", "-silver", "-bronze", "country"]));
  
  console.log(elTextObjs);
  
  // Add rank/position to objects
  let posLen = elTextObjs.length;
  
  let posIdx = 1;
  let oldPosIdx = 0;
  let accum = 0;
  // Start of loop
  for (var i = 0; i < posLen; i++) {
    if (oldPosIdx === posIdx) {
      accum++;
    } else {
      if (accum > 0) {
        posIdx = posIdx + accum;
        accum = 0;
      }
    }
    oldPosIdx = posIdx;
    if (i !== posLen) {
      console.log(elTextObjs[i]);
      if (elTextObjs[i].gold !== 0 && elTextObjs[i].gold >= elTextObjs[i + 1].gold) {
        if (elTextObjs[i].gold > elTextObjs[i + 1].gold) {
          elTextObjs[i].pos = posIdx;
          posIdx++;
        } else if (elTextObjs[i].silver > elTextObjs[i + 1].silver) {
          elTextObjs[i].pos = posIdx;
          posIdx++;
        } else if (elTextObjs[i].bronze > elTextObjs[i + 1].bronze) {
          elTextObjs[i].pos = posIdx;
          posIdx++;
        } else {
          elTextObjs[i].pos = posIdx;
        }
        continue;
      } else if (elTextObjs[i].silver !== 0 && elTextObjs[i].silver >= elTextObjs[i +1].silver) {
        if (elTextObjs[i].silver > elTextObjs[i +1].silver){
          elTextObjs[i].pos = posIdx;
          posIdx++;
        } else if (elTextObjs[i].bronze > elTextObjs[i + 1].bronze) {
          elTextObjs[i].pos = posIdx;
          posIdx++;
        } else {
          elTextObjs[i].pos = posIdx;
        }
        continue;
      } else if (elTextObjs[i + 1] !== undefined && elTextObjs[i].bronze !== 0 && elTextObjs[i].bronze >= elTextObjs[i + 1].bronze) {
        if (elTextObjs[i].bronze > elTextObjs[i + 1].bronze) {  
          elTextObjs[i].pos = posIdx;
          posIdx++;
        } else {
          elTextObjs[i].pos = posIdx;
        }
      } else {
        elTextObjs[i].pos = posIdx;
      }
    }
  }
  
  console.log(elTextObjs);
  
  console.timeEnd("loopDivs");
  
  return elTextObjs;
}

const checkOrPurge = () => {
  if (document.querySelector("#app .medal-table")) {
    purge(document.querySelector("#app"), 1);
  }
}

const updateTitleText = (titleText) => {
  document.querySelector("#app h1").textContent = `${titleText.replace(/-/, " ").toUpperCase()} Medals Table`;
}

const showOverlay = () => {
  console.log("Show");
  let overlay = document.querySelector(".overlay");
  overlay.style.display = "flex";
};

const hideOverlay = () => {
  console.log("Hide");
  let overlay = document.querySelector(".overlay");
  overlay.style.display = "none";
};


/* **************************************************************** */
/* Render UI */
const buildTable = (rowCells) => {
  console.log(rowCells);
  make("div", {
    attr: {
      class: "medal-table"
    },
    append: [
      [
        "table", {
          attr: {
            class: "medals",
            cellpadding: 0,
            cellspacing: 0,
          },
          append: [
            [
              "thead", {
                append: [
                  [
                    "th", {
                      attr: {
                        "data-short": "Pos"
                      },
                      append: [
                        [
                          "span", {
                            append: ["Position"]    
                          }
                        ]
                        
                      ]
                    }
                  ],
                  [
                    "th", {
                      append: [
                        [
                          "span", {
                            append: ["Country"]
                          }
                        ]
                      ]
                    }
                  ],
                  [
                    "th", {
                      attr: {
                        "data-short": "G"
                      },
                      append: [
                        [
                          "span", {
                            append: ["Gold"]
                          }
                        ]
                      ]
                      
                    }
                  ],
                  [
                    "th", {
                      attr: {
                        "data-short": "S"
                      },
                      append: [
                        [
                          "span", {
                            append: ["Silver"]
                          }
                        ]
                      ]
                    }
                  ],
                  [
                    "th", {
                      attr: {
                        "data-short": "B"
                      },
                      append: [
                        [
                          "span", {
                            append: ["Bronze"]
                          }
                        ]
                      ]
                    }
                  ],
                  [
                    "th", {
                      append: [
                        [
                          "span", {
                            append: ["Total"]
                          }
                        ]
                      ]
                    }
                  ]
                ]
              }
            ],
            [
              "tbody", {
                attr: {
                  class: "medals-tbl-body"
                }
              }
            ]
          ]
        }
      ]
    ],
    parent: document.querySelector("#app")
  });
  rowCells.forEach((row, index) => {
    make("tr", {
      append: [
        [
          "td", {
            attr: {
              class: `cell${index}`
            },
            append: [`${row.pos}`]
          }
        ],
        [
          "td", {
            attr: {
              class: `cell${index}`
            },
            append: [`${row.country}`]
          }
        ],
        [
          "td", {
            attr: {
              class: `cell${index}`
            },
            append: [`${row.gold}`]
          }
        ],
        [
          "td", {
            attr: {
              class: `cell${index}`
            },
            append: [`${row.silver}`]
          }
        ],
        [
          "td", {
            attr: {
              class: `cell${index}`
            },
            append: [`${row.bronze}`]
          }
        ],
        [
          "td", {
            attr: {
              class: `cell${index}`
            },
            append: [`${row.total}`]
          }
        ]
      ],
      parent: document.querySelector(".medals-tbl-body")
    });
  });
}

onInit();