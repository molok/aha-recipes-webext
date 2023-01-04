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
  let lbs = (x.origContent.match(/\(?[0-9.]+ (lb)s?\.?\s?\)?\s/gi)||[])[0]
  let ozs = (x.origContent.match(/\(?[0-9.]+ (oz)s?\.?\s?\)?\s/gi)||[])[0]
  let kgs = (x.origContent.match(/\(?[0-9.]+ (kg)s?\.?\s?\)?\s/gi)||[])[0]
  let gs = (x.origContent.match(/\(?[0-9.]+ (g)s?\.?\s?\)?\s/gi)||[])[0]
  x.content = x.origContent.replace(lbs, '#QTY#').replace(ozs, '#QTY#').replace(kgs, '#QTY#').replace(gs, '#QTY#')
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
  }
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

  // lines.forEach(x => console.log(`${x.id} => ${x.origContent}`))

  // console.log({maltsStart, maltsEnd})

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

    // console.log(`ingredients: ${ingredients.innerHTML}`)
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

let radioOptions = document.querySelectorAll('input[name="recipe_transform"]')
radioOptions.forEach( x => {
  x.addEventListener("change", function() {
    let value = this.value
    if (value === 'original') {
      showOriginal()
    } else {
      transformRecipe()
    }
  })
})

transformRecipe()

// Now monitor the DOM for additions
// @see https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver.
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes && mutation.addedNodes.length > 0) {
      // This DOM change was new nodes being added. Run our substitution
      // algorithm on each newly added node.
      for (let i = 0; i < mutation.addedNodes.length; i++) {
        const newNode = mutation.addedNodes[i];
        replaceText(newNode);
      }
    }
  });
});
observer.observe(document.body, {
  childList: true,
  subtree: true
});
