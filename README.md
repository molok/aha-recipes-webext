# Description

this extension adds information to homebrewersassociation.org recipes:

- adds percentages of the malts
- adds gram/liter ratio for hops addition
- ensure SI units are shown
- removes imperial units
- adds a radio button to show the original recipe (useful for debug)

I've only tested it on firefox, it usually works but recipes on the
homebrewersassociation website don't have a consistent schema so it can be
tricky to get everything right 100% of the time

I've only focused on all-grain beer recipes, this is intended for personal use

# To package

$> npm install --global web-ext

$> web-ext build
