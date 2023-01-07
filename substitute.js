function lb_to_g(lb) {
  return lb * 453.59
}

function oz_to_g(oz) {
  return oz * 28.35
}

function round(num, decimals) {
  let fact = 10 ** decimals
  return Math.round(num * fact) / fact
}

function usgallons_to_l(gal) {
  return gal * 3.78541
}

/* adds content and g */
function normalizeQty(si, x) {
  let origContent = x.origContent
      .replace("½", "0.5")
      .replace("⅓", "0.33")
      .replace("1/2", "0.5")
      .replace("1/3", "0.33")
      .replace("1/4", "0.25")
      .replace("1/5", "0.2")
      .replace("1/6", "0.166")
      .replace("1/7", "0.1428")
      .replace("1/8", "0.125")
      .replace("1/9", "0.11")
      .replace("1/10", "0.10")
  let lbs = (origContent.match(/\(?[0-9.]+ ?(lb)s?\.?\s?\)?\s/gi)||[])[0]
  let ozs = (origContent.match(/\(?[0-9.]+ ?(oz)s?\.?\s?\)?\s/gi)||[])[0]
  let kgs = (origContent.match(/\(?[0-9.]+ ?(kg)s?\.?\s?\)?\s/gi)||[])[0]
  let gs = (origContent.match(/\(?[0-9.]+ ?(g)s?\.?\s?\)?\s/gi)||[])[0]
  let sachets = (origContent.match(/\(?[0-9.]+ ?(sachet)s?\.?\s?\)?\s/gi)||[])[0]
  let package = (origContent.match(/\(?[0-9.]+ ?(package)s?\.?\s?\)?\s/gi)||[])[0]
  let tsp = (origContent.match(/\(?[0-9.]+ ?(tsp)s?\.?\s?\)?\s/gi)||[])[0]
  let ml = (origContent.match(/\(?[0-9.]+ ?(ml)s?\.?\s?\)?\s/gi)||[])[0]
  x.content = [lbs, ozs, kgs, gs, tsp, ml, sachets, package].reduce((acc, curr) => acc.replace(curr, '#QTY#'), origContent)
      .replaceAll(/  /g, ' ')
      .replaceAll(/(#QTY#|#QTY# ){2,}/g, '#QTY#')

  const normalizeSi = () => {
    if (kgs) {
      x.g = (+(kgs.match(/[0-9.]+/))) * 1000
    } else if (gs) {
      x.g = +(gs.match(/[0-9.]+/))
    } else if (ml) {
      x.ml = (+(ml.match(/[0-9.]+/)))
    }
  }
  const normalizeImperial = () => {
    if (lbs) {
      x.g = lb_to_g(+(lbs.match(/[0-9.]+/)))
    } else if (ozs) {
      x.g = oz_to_g(+(ozs.match(/[0-9.]+/)))
    } else if (tsp) {
      x.ml = 5 * (+(tsp.match(/[0-9.]+/)))
      x.clarification = tsp.trim()
    } else if (sachets) { /* yeast? */
      x.g = 11 * (+(sachets.match(/[0-9.]+/)))
      x.clarification = sachets.trim()
    } else if (package) { /* yeast? */
      x.g = 11 * (+(package.match(/[0-9.]+/)))
      x.clarification = package.trim()
    }
  }

  /* if the users prefers SI units, then we try to parse those first, this way the quantity
     in the recipe don't change, otherwise the user could potentially see the quantities changing
     for the rounding used in the recipe between oz and grams
   */
  if (si) {
    normalizeSi()
    if (x.g === undefined && x.ml === undefined) {
      normalizeImperial()
    }
  } else {
    normalizeImperial()
    if (x.g === undefined && x.ml === undefined) {
      normalizeSi()
    }
  }
}

/**
 *
 * @param inputMalts {Element[]}
 */
function rewriteMalts(si,inputMalts) {
  const malts = inputMalts.map(m => ({element: m, origContent: m.textContent}))
  malts.forEach(m => normalizeQty(si, m))

  const tot = malts.filter(x => x.g).map(x => x.g).reduce((acc, curr) => acc + curr, 0)
  malts.filter(x => x.g).forEach(x => x.perc = round(x.g * 100 / tot, 2))
  malts.filter(x => x.g).forEach(x => x.newContent = x.content
      .replaceAll(/\([0-9.]+\s?%\)/g, '') /* remove existing percentages */
      .replace('#QTY#', `🌾 ${round(x.perc, 2).toLocaleString()}% (${formatGrams(si, x.g, x.clarification)}) `))

  malts.forEach(m => {
    if (m.newContent && m.newContent !== m.origContent) {
      m.element.textContent = m.newContent
    }
  })
}

function rewriteGramsPerL(si, inputHops, batchSizeL, icon, precision) {
  const hops = inputHops.map(m => ({element: m, origContent: m.textContent}))
  hops.forEach(m => normalizeQty(si, m))

  hops.filter(x => x.g).forEach(x => x.gPerL = round(x.g / batchSizeL, 1+precision))
  hops.filter(x => x.ml).forEach(x => x.mlPerL = round(x.ml / batchSizeL, 1+precision))
  hops.filter(x => x.gPerL).forEach(x => x.newContent = x.content
      .replace('#QTY#', `${icon} ${formatGramsPerL(si, x.gPerL, x.g, precision, batchSizeL, x.clarification)} `))

  hops.filter(x => x.mlPerL).forEach(x => x.newContent = x.content
      .replace('#QTY#', `${icon} ${formatMlPerL(si, x.mlPerL, x.ml, precision, batchSizeL, x.clarification)} `))
      // .replace('#QTY#', `${icon} ${x.mlPerL.toFixed(2).padStart(3)}ml/L (${x.ml.toFixed(precision)}ml) `))


  hops.forEach(m => {
    if (m.newContent && m.newContent !== m.origContent) {
      m.element.textContent = m.newContent
    }
  })
}

function litersToGallons(liters) {
  return liters * 0.264172
}

function mlToFloz(ml) {
  return ml * 0.033814
}

function gramsToOz(grams) {
  return grams * 0.03527396195
}


function formatMlPerL(si, mlPerL, ml, precision, batchSizeL, clarification) {
  let clarSuffix = ''
  if (clarification) {
    clarSuffix = ` or ${clarification}`
  }
  if (si) {
    return `${mlPerL.toLocaleString()} ml/L (${ml.toLocaleString()} ml${clarSuffix}) `
  } else {
    let floz = mlToFloz(ml)
    let liters = batchSizeL
    let gallons = litersToGallons(liters)
    let flozPerGal = floz/gallons

    return `${flozPerGal.toLocaleString()} floz/gal (${floz.toLocaleString()} floz${clarSuffix}) `
  }
}

function formatGramsPerL(si, gPerL, grams, precision, batchSizeL, clarification) {
  let clarSuffix = ''
  if (clarification) {
    clarSuffix = ` or ${clarification}`
  }
  if (si) {
    return `${round(gPerL, precision+2).toLocaleString()} g/L (${round(grams, precision+1).toLocaleString()} g${clarSuffix})`
  } else {
    let oz = gramsToOz(grams)
    let liters = batchSizeL
    let gallons = litersToGallons(liters)
    let ozPerGal = oz/gallons

    return `${round(ozPerGal, precision+2).toLocaleString()} oz/gal (${round(oz, precision+1).toLocaleString()} oz${clarSuffix})`
  }
}

function formatGrams(si, grams, clarification) {
  let clarSuffix = ''
  if (clarification) {
    clarSuffix = ` or ${clarification}`
  }
  if (si) {
    if (grams > 1000) {
      return `${(grams / 1000).toLocaleString()} kg`
    } else {
      return `${round(grams, 0).toLocaleString()} g`
    }
  } else {
    /* imperial */
    let oz = grams * 0.03527396195
    if (oz > 16) {
      let lb = oz / 16
      return `${(lb).toLocaleString()} lb${clarSuffix}`
    }
    return `${round(oz, 3).toLocaleString()} oz${clarSuffix}`
  }
}


// Start the recursion from the body tag.
// replaceText(document.body);


function createRadio() {
  if (document.querySelector('#original') !== null) {
    return
  }

  const ingredients = document.querySelector(".recipe-meta");
  /** @type {Element} */
  let radio = document.createElement('div')

  function newRadioOption(inputId, label, value) {
    let div1 = document.createElement("div")
    div1.style = "font-family: futura-pt, futura, sans-serif"
    let input1 = document.createElement("input")
    input1.type = "radio"
    input1.id = inputId
    input1.name = "recipe_transform"
    input1.value = value

    let label1 = document.createElement("label")
    label1.htmlFor = inputId
    label1.textContent = label


    div1.appendChild(input1)
    /* for some reason it improves the rendering in firefox, I'm baffled */
    div1.appendChild(document.createTextNode("\u00A0"))

    div1.appendChild(label1)
    return div1
  }

  const div1 = newRadioOption("original", "Show Original", "original")
  const div2 = newRadioOption("transform", "Show SI and %", "transform")
  const div3 = newRadioOption("imperial", "Show Imperial and %", "imperial")

  radio.appendChild(div1)
  radio.appendChild(div2)
  radio.appendChild(div3)

  ingredients.appendChild(radio)

  document.querySelector('#transform').setAttribute("checked", "")

  let radioOptions = document.querySelectorAll('input[name="recipe_transform"]')
  radioOptions.forEach( x => {
    x.addEventListener("change", function() {
      let value = this.value
      if (value === 'original') {
        showOriginal()
      } else if (value === 'transform') {
        transformRecipe2()
      } else if (value === 'imperial') {
        transformRecipe2(false)
      }
    })
  })
}

function batchSize(si, ingredients) {
  let batchSizeL = null
  let batchSizeElement = [...ingredients.querySelectorAll("p")].find(e => e.textContent.includes("Yield:"))

  if (batchSizeElement === undefined) {
    return null
  }

  let yieldElements = []
  let curr
  if (batchSizeElement.firstChild !== null) {
    curr = batchSizeElement.firstChild
    while (curr.nextSibling !== null) {
      yieldElements = [...yieldElements, curr.nextSibling]
      curr = curr.nextSibling
    }
  }

  yieldElements = [...yieldElements, batchSizeElement]

  function matchBatchSize(el) {
    if (!el.textContent) { return [null, null] }
    const batchSizeGRaw = (el.textContent.match(/\(?[0-9.,]+ (us|u.s.)? ?(gallon|gal)s?\.?\)?/gi) || [])[0]
    const batchSizeLRaw = (el.textContent.match(/\(?[0-9.,]+ (liter|l)s?\.?\)?/gi) || [])[0]
    return [batchSizeGRaw, batchSizeLRaw]
  }

  /* I'm looking for the smaller node matching at least one regex because I don't want to modify unwanted attributes of
     the text content: often in the recipe the Yield string is bold, so I only want to match the node with the batch size
     to avoid overriding the boldness or other style elements
   */
  batchSizeElement = yieldElements.find(x => matchBatchSize(x).filter(x => !!x).length > 0)

  let [batchSizeGRaw, batchSizeLRaw] = matchBatchSize(batchSizeElement)

  if (batchSizeGRaw) {
    batchSizeL = round(usgallons_to_l(+(batchSizeGRaw.match(/[0-9.]+/)[0])), 2)
  } else if (batchSizeLRaw) {
    batchSizeL = +(batchSizeLRaw.match(/[0-9.]+/)[0])
  }

  let content = batchSizeElement.textContent.replace(batchSizeGRaw, '#QTY#').replace(batchSizeLRaw, '#QTY#')
      .replaceAll(/  /g, ' ')
      .replaceAll(/(#QTY#|#QTY# ){2,}/g, '#QTY#')

  if (si) {
    content = content.replace("#QTY#", `${round(batchSizeL, 2)} L`)
  } else {
    content = content.replace("#QTY#", `${round(litersToGallons(batchSizeL), 2).toLocaleString()} US gal`)
  }

  batchSizeElement.textContent = content

  return batchSizeL;
}

function transformRecipe2(si) {
  showOriginal()
  if (si === undefined) {
    si = true
  }
  /** @type {Element} */
  const ingredients = document.querySelector('.ingredients')
  /** @type {NodeListOf<Element>} */
  const headersStrong = ingredients.querySelectorAll("li>strong")

  let ingredientGroups = {malts: [], hops: [], yeast: [], additions: []}

  if (headersStrong.length > 0) {
    let ingredientGroupsAll = {}
    let currentHeader = null
    ingredients.querySelectorAll('li').forEach(
        li => {
          let maybeHeader = li.querySelector("strong")
          if (maybeHeader != null) {
            currentHeader = maybeHeader.textContent
            return
          }
          if (ingredientGroupsAll[currentHeader] === undefined) {
            ingredientGroupsAll[currentHeader] = []
          }
          ingredientGroupsAll[currentHeader] = [...ingredientGroupsAll[currentHeader], li]
        }
    )

    Object.getOwnPropertyNames(ingredientGroupsAll).forEach(x => {
      if (["MALT", "FERMENTABLE", "GRAINS", "EXTRACT", "ADJUNCT"].find(c => x.toUpperCase().includes(c)) !== undefined) {
        ingredientGroups.malts = [...ingredientGroups.malts, ...ingredientGroupsAll[x]]
      }

      if (x.toUpperCase().includes("HOP")) { ingredientGroups.hops = ingredientGroupsAll[x] }
      if (x.toUpperCase().includes("YEAST")) { ingredientGroups.yeast = ingredientGroupsAll[x] }
      if (x.toUpperCase().includes("ADDITION")) { ingredientGroups.additions = ingredientGroupsAll[x] }
    })
  }

  if (ingredientGroups.malts.length === 0) {
    ingredientGroups.malts = [...ingredients.querySelectorAll('li')]
        .filter(m => !m.textContent.toUpperCase().includes("SUGAR") || !m.textContent.toUpperCase().includes("PRIM"))
        .filter(m => ["MALT", "BARLEY", "OATS", "EXTRACT", "SUGAR", " LME", ' DME'].find(c => m.textContent.toUpperCase().includes(c)) !== undefined)
  }

  if (ingredientGroups.hops.length === 0) {
    ingredientGroups.hops = [...ingredients.querySelectorAll('li')]
        .filter(m => ["HOP", "PELLET", " AA ", " A.A. "].find( c => m.textContent.toUpperCase().includes(c)) !== undefined)
  }

  if (ingredientGroups.yeast.length === 0) {
    ingredientGroups.yeast = [...ingredients.querySelectorAll('li')]
        .filter(m => !m.textContent.toUpperCase().includes("NUTRIENT"))
        .filter(m => ["YEAST"].find( c => m.textContent.toUpperCase().includes(c)) !== undefined)
  }

  if (ingredientGroups.additions.length === 0) {
    ingredientGroups.additions = [...ingredients.querySelectorAll('li')]
        .filter(m => ["IRISH MOSS", "PROTAFLOC", "NUTRIENT"].find( c => m.textContent.toUpperCase().includes(c)) !== undefined)
  }
  let batchSizeL = batchSize(si, ingredients);

  if (ingredientGroups.malts.length > 0) { rewriteMalts(si, ingredientGroups.malts) }
  if (ingredientGroups.hops.length > 0) { rewriteGramsPerL(si, ingredientGroups.hops, batchSizeL, "🌿", 1) }
  if (ingredientGroups.yeast.length > 0) { rewriteGramsPerL(si, ingredientGroups.yeast, batchSizeL, "🧪", 1) }
  if (ingredientGroups.additions.length > 0) { rewriteGramsPerL(si, ingredientGroups.additions, batchSizeL, "✨", 1) }
}

let originalIngredientsElement
function saveOriginal() {
  originalIngredientsElement = document.querySelector('.ingredients').cloneNode(true)
}

function showOriginal() {
  try {
    /** @type {Element} */
    let currentIngredients = document.querySelector('.ingredients')
    /** @type {Element} */
    let parent = currentIngredients.parentElement
    parent.replaceChild(originalIngredientsElement, currentIngredients)

    //clone again for next replacement, otherwise it only works the first time
    originalIngredientsElement = document.querySelector('.ingredients').cloneNode(true)
  } catch (e) {
    console.error(e)
  }
}

try {
  createRadio()
  saveOriginal()
  transformRecipe2()
} catch (e) {
  console.error(e)
}
