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
  let origContent = x.origContent.replace("½", "0.5")
  let lbs = (origContent.match(/\(?[0-9.]+ ?(lb)s?\.?\s?\)?\s/gi)||[])[0]
  let ozs = (origContent.match(/\(?[0-9.]+ ?(oz)s?\.?\s?\)?\s/gi)||[])[0]
  let kgs = (origContent.match(/\(?[0-9.]+ ?(kg)s?\.?\s?\)?\s/gi)||[])[0]
  let gs = (origContent.match(/\(?[0-9.]+ ?(g)s?\.?\s?\)?\s/gi)||[])[0]
  let tsp = (origContent.match(/\(?[0-9.]+ ?(tsp)s?\.?\s?\)?\s/gi)||[])[0]
  let ml = (origContent.match(/\(?[0-9.]+ ?(ml)s?\.?\s?\)?\s/gi)||[])[0]
  x.content = [lbs, ozs, kgs, gs, tsp, ml].reduce((acc, curr) => acc.replace(curr, '#QTY#'), origContent)
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
  }
}

/**
 *
 * @param malts {Element[]}
 */
function rewriteMalts(inputMalts) {
  const malts = inputMalts.map(m => ({element: m, origContent: m.textContent}))
  malts.forEach(m => normalizeQty(m))

  const tot = malts.filter(x => x.g).map(x => x.g).reduce((acc, curr) => acc + curr, 0)
  malts.filter(x => x.g).forEach(x => x.perc = round(x.g * 100 / tot, 1))
  malts.filter(x => x.g).forEach(x => x.newContent = x.content
      .replaceAll(/\([0-9.]+\s?%\)/g, '') /* remove existing percentages */
      .replace('#QTY#', `🌾 ${x.perc.toFixed(2).padStart(6)}% (${formatGrams(x.g)}) `))

  malts.forEach(m => {
    if (m.newContent && m.newContent !== m.origContent) {
      m.element.textContent = m.newContent
    }
  })
}

function rewriteGramsPerL(inputHops, batchSizeL, icon) {
  const hops = inputHops.map(m => ({element: m, origContent: m.textContent}))
  hops.forEach(m => normalizeQty(m))

  hops.filter(x => x.g).forEach(x => x.gPerL = round(x.g / batchSizeL, 1))
  hops.filter(x => x.ml).forEach(x => x.mlPerL = round(x.ml / batchSizeL, 1))
  hops.filter(x => x.gPerL).forEach(x => x.newContent = x.content
      .replace('#QTY#', `${icon} ${x.gPerL.toFixed(2).padStart(3)}g/L (${x.g.toFixed(0)}g) `))

  hops.filter(x => x.mlPerL).forEach(x => x.newContent = x.content
      .replace('#QTY#', `${icon} ${x.mlPerL.toFixed(2).padStart(3)}ml/L (${x.ml.toFixed(0)}ml) `))

  hops.forEach(m => {
    if (m.newContent && m.newContent !== m.origContent) {
      m.element.textContent = m.newContent
    }
  })
}


function transformMalts(input) {
  let lines = input.split("\n").map((x, idx) => ({id: idx, origContent: x}))
  let maltsStart = lines.filter(x => x.origContent.toUpperCase().includes("MALTS") || x.origContent.toUpperCase().includes("FERMENTABLES")).map(x => x.id)[0]
  if (maltsStart === undefined || maltsStart === null) {
    maltsStart = lines.filter(x => x.origContent.toUpperCase().includes("INGREDIENTS")).map(x => x.id)[0]
  }
  const maltsEnd = lines.filter(x => x.id > maltsStart).filter(x =>
      x.origContent.includes("<strong>") ||
      (x.origContent.replaceAll(/<[^>]*>/g, '').trim().length >= 4 && x.origContent.replaceAll(/<[^>]*>/g, '').toUpperCase() === x.origContent.replaceAll(/<[^>]*>/g, '')) ||
      x.origContent.includes("hops") || x.origContent.includes("pellets"))
      .map(x => x.id)[0]

  const malts = lines.slice(maltsStart +1, maltsEnd)
      .filter(x => !x.origContent.toUpperCase().includes("YIELD") && !x.origContent.toUpperCase().includes("YEAST") && !x.origContent.toUpperCase().includes("HOPS"))
  malts.forEach(x => { normalizeQty(x) })

  const tot = malts.filter(x => x.g).map(x => x.g).reduce((acc, curr) => acc + curr, 0)
  malts.filter(x => x.g).forEach(x => x.perc = round(x.g * 100 / tot, 1))
  malts.filter(x => x.g).forEach(x => x.newContent = x.content
      .replace('#QTY#', `🌾 ${x.perc.toFixed(2).padStart(6)}% (${formatGrams(x.g)}) `))

  return lines.map( x => x.newContent || x.origContent).join("\n")
}

function formatGrams(grams) {
  if (grams > 1000) {
    return `${(grams / 1000).toFixed(2)} kg`
  } else {
    return `${(grams).toFixed(0)} g`
  }
}

function transformHops(input, sectionName) {
  let lines = input.split("\n").map((x, idx) => ({id: idx, origContent: x}))
  let hopsStart = lines.filter(x => x.origContent.toUpperCase().includes(sectionName)).map(x => x.id)[0]

  if (hopsStart === undefined || hopsStart === null) {
    return input
  }

  const hopsEnd = lines.filter(x => x.id > hopsStart).filter(x => x.origContent.includes("<strong>") ||
      x.origContent.replaceAll(/<[^>]*>/g, '').toUpperCase() === x.origContent.replaceAll(/<[^>]*>/g, '')).map(x => x.id)[0]

  const hops = lines.slice(hopsStart, hopsEnd)
      .filter(x => !x.origContent.toUpperCase().includes("YIELD")
          && !x.origContent.toUpperCase().includes("YEAST")
          && !x.origContent.toUpperCase().includes("MALT")
      )

  hops.forEach(x => { normalizeQty(x) })

  const batchSizeElement = lines.find(x => x.origContent.includes("Yield"))

  const batchSizeGRaw = (batchSizeElement.origContent.match(/\(?[0-9.]+ (us|u.s.)? ?(gallon|gal)s?\.?\)?/gi)||[])[0]
  const batchSizeLRaw = (batchSizeElement.origContent.match(/\(?[0-9.]+ (liter|l)s?\.?\)?/gi)||[])[0]
  let batchSizeL
  if (batchSizeLRaw) {
    batchSizeL = +(batchSizeLRaw.match(/[0-9.]+/)[0])
  } else if (batchSizeGRaw) {
    batchSizeL = round(usgallons_to_l(+(batchSizeGRaw.match(/[0-9.]+/)[0])), 1)
  }

  batchSizeElement.newContent = batchSizeElement.origContent.replace(batchSizeGRaw, '#QTY#').replace(batchSizeLRaw, '#QTY#')
      .replaceAll(/  /g, ' ')
      .replaceAll(/(#QTY#|#QTY# ){2,}/g, '#QTY#')
      .replace("#QTY#", `${batchSizeL} L`)

  hops.filter(x => x.g).forEach(x => x.gPerL = round(x.g / batchSizeL, 1))
  hops.filter(x => x.gPerL).forEach(x => x.newContent = x.content
      .replace('#QTY#', `🌿 ${x.gPerL.toFixed(2).padStart(3)}g/L (${x.g.toFixed(0)}g) `))

  return lines.map( x => x.newContent || x.origContent).join("\n")
}

let original

function transformRecipe() {
  try {
    const ingredients = document.querySelector(".ingredients");
    original = ingredients.innerHTML

    const newContent = transformMalts(ingredients.innerHTML)
    const newContent2 = transformHops(newContent, "HOPS")
    const newContent3 = transformHops(newContent2, "ADDITIONAL")
    const newContent4 = transformHops(newContent3, "MISC")
    const newContent5 = transformHops(newContent4, "PELLETS")
    ingredients.innerHTML = newContent5
  } catch (e) {
    console.error(e)
  }
}

function showOriginal() {
  const ingredients = document.querySelector(".ingredients");
  ingredients.innerHTML = original
}

// Start the recursion from the body tag.
// replaceText(document.body);

const ingredients = document.querySelector(".recipe-meta");
let radio = document.createElement('div')
radio.innerHTML = `
<div>
      <input type="radio" id="transform" name="recipe_transform" value="transform"
             checked>
      <label for="transform">Show Percentages</label>
    </div>

    <div>
      <input type="radio" id="original" name="recipe_transform" value="original">
      <label for="original">Show Original</label>
    </div>
`
ingredients.appendChild(radio)

function transformRecipe2() {
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
      if (x.toUpperCase().includes("MALT") || x.toUpperCase().includes("FERMENTABLE")) {
        ingredientGroups.malts = ingredientGroupsAll[x]
      }

      if (x.toUpperCase().includes("HOP")) {
        ingredientGroups.hops = ingredientGroupsAll[x]
      }

      if (x.toUpperCase().includes("YEAST")) {
        ingredientGroups.yeast = ingredientGroupsAll[x]
      }

      if (x.toUpperCase().includes("ADDITION")) {
        ingredientGroups.additions = ingredientGroupsAll[x]
      }
    })
  } else {
    ingredientGroups.malts = [...ingredients.querySelectorAll('li')]
        .filter(m => ["MALT", "BARLEY", "OATS", "EXTRACT"].find( c => m.textContent.toUpperCase().includes(c)) !== undefined)

    ingredientGroups.hops = [...ingredients.querySelectorAll('li')]
        .filter(m => ["HOP", "PELLET", " AA ", " A.A "].find( c => m.textContent.toUpperCase().includes(c)) !== undefined)

    ingredientGroups.yeast = [...ingredients.querySelectorAll('li')]
        .filter(m => ["YEAST"].find( c => m.textContent.toUpperCase().includes(c)) !== undefined)

    ingredientGroups.additions = [...ingredients.querySelectorAll('li')]
        .filter(m => ["IRISH MOSS", "PROTAFLOC"].find( c => m.textContent.toUpperCase().includes(c)) !== undefined)
  }

  if (ingredientGroups.malts) {
    rewriteMalts(ingredientGroups.malts)
  }

  if (ingredientGroups.hops) {
    rewriteGramsPerL(ingredientGroups.hops, 10, "🌿")
  }

  if (ingredientGroups.yeast) {
    rewriteGramsPerL(ingredientGroups.yeast, 10, "🧪")
  }

  if (ingredientGroups.additions) {
    rewriteGramsPerL(ingredientGroups.additions, 10, "✨")
  }
}

let radioOptions = document.querySelectorAll('input[name="recipe_transform"]')
radioOptions.forEach( x => {
  x.addEventListener("change", function() {
    let value = this.value
    if (value === 'original') {
      showOriginal()
    } else {
      transformRecipe2()
    }
  })
})

transformRecipe2()
