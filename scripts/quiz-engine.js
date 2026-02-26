(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.GenesisQuizEngine = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var CATEGORY_KEYS = ['Foundational', 'Focus', 'Energy', 'Sleep', 'Recovery', 'Performance', 'Immunity'];

  var CATEGORY_PREFERENCES = {
    Foundational: [
      ['multivitamin', 'daily multi'],
      ['omega-3', 'fish oil', 'krill oil', 'cod liver'],
      ['magnesium glycinate', 'vitamin d3', 'coq10']
    ],
    Focus: [
      ['lions mane', 'nootropic', 'bacopa', 'ginkgo'],
      ['rhodiola', 'ashwagandha', 'ginseng', 'holy basil'],
      ['b12', 'coq10', 'mct oil']
    ],
    Energy: [
      ['berberine', 'metabolic', 'green coffee', 'garcinia', 'keto'],
      ['electrolyte', 'mct oil', 'energy tea'],
      ['apple cider vinegar']
    ],
    Sleep: [
      ['melatonin', 'sleep tea', 'valerian', 'gaba', '5-htp'],
      ['magnesium glycinate', 'tart cherry'],
      ['holy basil']
    ],
    Recovery: [
      ['electrolyte', 'post-workout', 'tart cherry'],
      ['joint', 'turmeric', 'collagen'],
      ['digestive', 'probiotic']
    ],
    Performance: [
      ['creatine'],
      ['whey protein', 'bcaa'],
      ['electrolyte', 'beetroot', 'pre workout']
    ],
    Immunity: [
      ['elderberry', 'vitamin c', 'zinc'],
      ['echinacea', 'mushroom', 'olive leaf'],
      ['quercetin', 'goldenseal', 'astragalus']
    ]
  };

  var STIMULANT_RE = /pre workout|fat burner|metabolic ignite|energy tea|green coffee|guarana|caffeine/i;

  function normalizeAnswers(input) {
    var value = input || {};
    return {
      goal: String(value.goal || '').toLowerCase(),
      stress: String(value.stress || '').toLowerCase(),
      sleep: String(value.sleep || '').toLowerCase(),
      training: String(value.training || '').toLowerCase(),
      foundation: String(value.foundation || '').toLowerCase()
    };
  }

  function initializeScores() {
    var scores = {};
    CATEGORY_KEYS.forEach(function (key) {
      scores[key] = 0;
    });
    return scores;
  }

  function scoreAnswers(rawAnswers) {
    var answers = normalizeAnswers(rawAnswers);
    var scores = initializeScores();

    scores.Foundational += 2;

    if (answers.goal === 'focus') {
      scores.Focus += 4;
    } else if (answers.goal === 'energy') {
      scores.Energy += 4;
      scores.Performance += 1;
    } else if (answers.goal === 'performance') {
      scores.Performance += 4;
      scores.Recovery += 1;
    } else if (answers.goal === 'sleep') {
      scores.Sleep += 4;
      scores.Recovery += 2;
    } else if (answers.goal === 'recovery') {
      scores.Recovery += 4;
      scores.Sleep += 1;
    } else if (answers.goal === 'immunity') {
      scores.Immunity += 4;
      scores.Foundational += 1;
    } else {
      scores.Foundational += 4;
      scores.Recovery += 1;
    }

    if (answers.stress === 'high') {
      scores.Sleep += 2;
      scores.Recovery += 2;
      scores.Focus += 1;
      scores.Energy -= 1;
    } else if (answers.stress === 'medium') {
      scores.Focus += 1;
      scores.Recovery += 1;
    } else if (answers.stress === 'low') {
      scores.Performance += 1;
    }

    if (answers.sleep === 'poor') {
      scores.Sleep += 3;
      scores.Recovery += 1;
      scores.Energy -= 1;
    } else if (answers.sleep === 'ok') {
      scores.Sleep += 1;
    } else if (answers.sleep === 'strong') {
      scores.Focus += 1;
      scores.Performance += 1;
    }

    if (answers.training === 'high') {
      scores.Performance += 3;
      scores.Recovery += 2;
      scores.Energy += 1;
    } else if (answers.training === 'moderate') {
      scores.Performance += 2;
      scores.Recovery += 1;
    } else if (answers.training === 'low') {
      scores.Foundational += 1;
    }

    if (answers.foundation === 'none') {
      scores.Foundational += 4;
    } else if (answers.foundation === 'some') {
      scores.Foundational += 2;
    } else if (answers.foundation === 'solid') {
      scores.Focus += 1;
      scores.Performance += 1;
    }

    return scores;
  }

  function includesAny(text, terms) {
    var lower = String(text || '').toLowerCase();
    return terms.some(function (term) {
      return lower.includes(String(term).toLowerCase());
    });
  }

  function sortByScore(scores) {
    return Object.keys(scores).sort(function (a, b) {
      return scores[b] - scores[a];
    });
  }

  function matchesGoalCategory(goal) {
    if (goal === 'focus') return 'Focus';
    if (goal === 'energy') return 'Energy';
    if (goal === 'sleep') return 'Sleep';
    if (goal === 'performance') return 'Performance';
    if (goal === 'recovery') return 'Recovery';
    if (goal === 'immunity') return 'Immunity';
    return 'Foundational';
  }

  function shouldAvoidStimulants(answers) {
    return answers.stress === 'high' || answers.sleep === 'poor';
  }

  function filterCandidates(products, category, avoidStim, usedIds) {
    var candidates = products.filter(function (product) {
      return product.category === category && !usedIds.has(product.id);
    });

    if (!avoidStim || (category !== 'Energy' && category !== 'Performance' && category !== 'Focus')) {
      return candidates;
    }

    var stimulantSafe = candidates.filter(function (product) {
      var haystack = product.name + ' ' + product.ingredients;
      return !STIMULANT_RE.test(haystack);
    });

    return stimulantSafe.length ? stimulantSafe : candidates;
  }

  function pickByPreferences(candidates, preferenceGroups) {
    for (var i = 0; i < preferenceGroups.length; i += 1) {
      var terms = preferenceGroups[i];
      var found = candidates.find(function (product) {
        return includesAny(product.name, terms);
      });
      if (found) {
        return found;
      }
    }

    return candidates[0] || null;
  }

  function addCategoryPick(state, category) {
    var candidates = filterCandidates(state.products, category, state.avoidStim, state.usedIds);
    if (!candidates.length) {
      return null;
    }

    var preferred = pickByPreferences(candidates, CATEGORY_PREFERENCES[category] || []);
    if (!preferred) {
      return null;
    }

    state.usedIds.add(preferred.id);
    state.stack.push(preferred);
    return preferred;
  }

  function ensureCategory(state, category) {
    var hasCategory = state.stack.some(function (product) {
      return product.category === category;
    });
    if (hasCategory) {
      return;
    }
    addCategoryPick(state, category);
  }

  function desiredStackSize(answers) {
    if (answers.training === 'high' || answers.foundation === 'none') {
      return 5;
    }
    return 4;
  }

  function buildRationale(answers, scores, stack) {
    var reasons = [];

    reasons.push('Primary objective weighted toward ' + matchesGoalCategory(answers.goal) + '.');

    if (answers.stress === 'high') {
      reasons.push('High stress input increased Recovery and Sleep support weighting.');
    }

    if (answers.sleep === 'poor') {
      reasons.push('Poor sleep input enforced at least one Sleep module.');
    }

    if (answers.training === 'high') {
      reasons.push('High training demand enforced a Performance module.');
    }

    if (answers.foundation === 'none') {
      reasons.push('No baseline indicated two Foundational modules for routine coverage.');
    }

    if (shouldAvoidStimulants(answers)) {
      reasons.push('Recommendation logic filtered stimulant-forward products where possible.');
    }

    if (!reasons.length) {
      reasons.push('Balanced responses mapped to a foundational-first stack with targeted support.');
    }

    return {
      scores: scores,
      notes: reasons,
      stackSize: stack.length
    };
  }

  function recommendStack(productsInput, rawAnswers) {
    var products = Array.isArray(productsInput) ? productsInput.slice() : [];
    var answers = normalizeAnswers(rawAnswers);
    var scores = scoreAnswers(answers);
    var sortedCategories = sortByScore(scores);
    var state = {
      products: products,
      avoidStim: shouldAvoidStimulants(answers),
      usedIds: new Set(),
      stack: []
    };

    var foundationalCount = answers.foundation === 'none' ? 2 : 1;
    for (var i = 0; i < foundationalCount; i += 1) {
      addCategoryPick(state, 'Foundational');
    }

    ensureCategory(state, matchesGoalCategory(answers.goal));

    if (answers.sleep === 'poor') {
      ensureCategory(state, 'Sleep');
    }

    if (answers.stress === 'high') {
      ensureCategory(state, 'Recovery');
    }

    if (answers.training === 'high' || answers.training === 'moderate') {
      ensureCategory(state, 'Performance');
    }

    if (answers.goal === 'immunity') {
      ensureCategory(state, 'Immunity');
    }

    var targetSize = desiredStackSize(answers);

    for (var j = 0; j < sortedCategories.length && state.stack.length < targetSize; j += 1) {
      addCategoryPick(state, sortedCategories[j]);
    }

    while (state.stack.length < 3) {
      var added = addCategoryPick(state, 'Foundational') || addCategoryPick(state, 'Recovery') || addCategoryPick(state, 'Focus');
      if (!added) {
        break;
      }
    }

    var rationale = buildRationale(answers, scores, state.stack);

    return {
      answers: answers,
      scores: scores,
      products: state.stack,
      productIds: state.stack.map(function (product) {
        return product.id;
      }),
      rationale: rationale
    };
  }

  function generateAnswerCombinations() {
    var goals = ['focus', 'energy', 'sleep', 'immunity', 'foundation'];
    var stress = ['high', 'medium', 'low'];
    var sleep = ['poor', 'ok', 'strong'];
    var training = ['high', 'moderate', 'low'];
    var foundation = ['none', 'some', 'solid'];

    var all = [];

    goals.forEach(function (goal) {
      stress.forEach(function (stressValue) {
        sleep.forEach(function (sleepValue) {
          training.forEach(function (trainingValue) {
            foundation.forEach(function (foundationValue) {
              all.push({
                goal: goal,
                stress: stressValue,
                sleep: sleepValue,
                training: trainingValue,
                foundation: foundationValue
              });
            });
          });
        });
      });
    });

    return all;
  }

  return {
    recommendStack: recommendStack,
    scoreAnswers: scoreAnswers,
    generateAnswerCombinations: generateAnswerCombinations
  };
});
