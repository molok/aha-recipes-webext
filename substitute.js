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
function normalizeQty(x) {
  let origContent = x.origContent.replace("½", "0.5").replace("1/2", "0.5")
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

  if (kgs) {
    x.g = (+(kgs.match(/[0-9.]+/))) * 1000
  } else if (gs) {
    x.g = +(gs.match(/[0-9.]+/))
  } else if (lbs) {
    x.g = lb_to_g(+(lbs.match(/[0-9.]+/)))
  } else if (ozs) {
    x.g = oz_to_g(+(ozs.match(/[0-9.]+/)))
  } else if (ml) {
    x.ml = (+(ml.match(/[0-9.]+/)))
  } else if (tsp) {
    x.ml = 5 * (+(tsp.match(/[0-9.]+/)))
  } else if (sachets) { /* yeast? */
    x.g = 11 * (+(sachets.match(/[0-9.]+/)))
  } else if (package) { /* yeast? */
    x.g = 11 * (+(package.match(/[0-9.]+/)))
  }
}

/**
 *
 * @param inputMalts {Element[]}
 */
function rewriteMalts(si,inputMalts) {
  const malts = inputMalts.map(m => ({element: m, origContent: m.textContent}))
  malts.forEach(m => normalizeQty(m))

  const tot = malts.filter(x => x.g).map(x => x.g).reduce((acc, curr) => acc + curr, 0)
  malts.filter(x => x.g).forEach(x => x.perc = round(x.g * 100 / tot, 1))
  malts.filter(x => x.g).forEach(x => x.newContent = x.content
      .replaceAll(/\([0-9.]+\s?%\)/g, '') /* remove existing percentages */
      .replace('#QTY#', `🌾 ${x.perc.toFixed(2).padStart(6)}% (${formatGrams(si, x.g)}) `))

  malts.forEach(m => {
    if (m.newContent && m.newContent !== m.origContent) {
      m.element.textContent = m.newContent
    }
  })
}

function rewriteGramsPerL(si, inputHops, batchSizeL, icon, precision) {
  const hops = inputHops.map(m => ({element: m, origContent: m.textContent}))
  hops.forEach(m => normalizeQty(m))

  hops.filter(x => x.g).forEach(x => x.gPerL = round(x.g / batchSizeL, 1+precision))
  hops.filter(x => x.ml).forEach(x => x.mlPerL = round(x.ml / batchSizeL, 1+precision))
  hops.filter(x => x.gPerL).forEach(x => x.newContent = x.content
      .replace('#QTY#', `${icon} ${formatGramsPerL(si, x.gPerL, x.g, precision, batchSizeL)} `))

  hops.filter(x => x.mlPerL).forEach(x => x.newContent = x.content
      .replace('#QTY#', `${icon} ${formatMlPerL(si, x.mlPerL, x.ml, precision, batchSizeL)}`))
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


function formatMlPerL(si, mlPerL, ml, precision, batchSizeL) {
  if (si) {
    return `${mlPerL.toFixed(2).padStart(3)} ml/L (${ml.toFixed(precision)} ml) `
  } else {
    let floz = mlToFloz(ml)
    let liters = batchSizeL
    let gallons = litersToGallons(liters)
    let flozPerGal = floz/gallons

    return `${flozPerGal.toFixed(2+2).padStart(3)} floz/gal (${floz.toFixed(precision+2)} floz) `
  }
}

function formatGramsPerL(si, gPerL, grams, precision, batchSizeL) {
  if (si) {
    return `${gPerL.toFixed(2).padStart(3)} g/L (${grams.toFixed(precision)} g)`
  } else {
    let oz = gramsToOz(grams)
    let liters = batchSizeL
    let gallons = litersToGallons(liters)
    let ozPerGal = oz/gallons

    return `${ozPerGal.toFixed(3).padStart(3)} oz/gal (${oz.toFixed(precision+2)} oz)`
  }
}

function formatGrams(si, grams) {
  if (si) {
    if (grams > 1000) {
      return `${(grams / 1000).toFixed(2)} kg`
    } else {
      return `${(grams).toFixed(0)} g`
    }
  } else {
    /* imperial */
    let oz = grams * 0.03527396195
    if (oz > 16) {
      let lb = oz / 16
      return `${(lb).toFixed(2)} lb`
    }
    return `${(oz).toFixed(2)} oz`
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

function batchSize(ingredients) {
  let batchSizeL = null
  let batchSizeElement = [...ingredients.querySelectorAll("p")].find(e => e.textContent.includes("Yield:"))
  if (batchSizeElement !== undefined) {
    const batchSizeGRaw = (batchSizeElement.textContent.match(/\(?[0-9.]+ (us|u.s.)? ?(gallon|gal)s?\.?\)?/gi) || [])[0]
    const batchSizeLRaw = (batchSizeElement.textContent.match(/\(?[0-9.]+ (liter|l)s?\.?\)?/gi) || [])[0]
    if (batchSizeLRaw) {
      batchSizeL = +(batchSizeLRaw.match(/[0-9.]+/)[0])
    } else if (batchSizeGRaw) {
      batchSizeL = round(usgallons_to_l(+(batchSizeGRaw.match(/[0-9.]+/)[0])), 1)
    }

    batchSizeElement.textContent = batchSizeElement.textContent.replace(batchSizeGRaw, '#QTY#').replace(batchSizeLRaw, '#QTY#')
        .replaceAll(/  /g, ' ')
        .replaceAll(/(#QTY#|#QTY# ){2,}/g, '#QTY#')
        .replace("#QTY#", `${batchSizeL} L`)
  }

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
        .filter(m => ["MALT", "BARLEY", "OATS", "EXTRACT", "SUGAR"].find(c => m.textContent.toUpperCase().includes(c)) !== undefined)
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
  let batchSizeL = batchSize(ingredients);

  if (ingredientGroups.malts.length > 0) { rewriteMalts(si, ingredientGroups.malts) }
  if (ingredientGroups.hops.length > 0) { rewriteGramsPerL(si, ingredientGroups.hops, batchSizeL, "🌿", 0) }
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
