const toolRunner = {
  async search(query) {
    return {
      query,
      takeaways: [
        `Simulated search insights for "${query}".`,
        'Enhance this by integrating a real search API such as Tavily or SerpAPI.',
      ],
      timestamp: new Date().toISOString(),
    };
  },

  async math(expression) {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function(`return (${expression})`);
      const result = fn();
      return { expression, result, timestamp: new Date().toISOString() };
    } catch (error) {
      return { expression, error: error.message };
    }
  },

  async code(description) {
    return {
      description,
      note: 'Code execution sandbox not configured. This is a placeholder response.',
      timestamp: new Date().toISOString(),
    };
  },
};

export async function runSupportTools(agentId, context) {
  if (agentId === 'C') {
    const query =
      context.state.openQuestions?.slice(-1)[0] ||
      context.topic ||
      'latest evidence for debate topic';
    const searchResult = await toolRunner.search(query);
    return { searchResult };
  }

  if (agentId === 'F') {
    const latestHypothesis = findLatestHypothesis(context.history);
    const mathExpression = latestHypothesis?.structure?.claims?.length
      ? `${latestHypothesis.structure.claims.length} * 2`
      : '1 + 1';
    const mathResult = await toolRunner.math(mathExpression);
    return {
      latestHypothesis: latestHypothesis?.structure || null,
      mathResult,
    };
  }

  return null;
}

function findLatestHypothesis(history = []) {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i]?.agent === 'A') {
      return history[i];
    }
  }
  return null;
}

export { toolRunner };


