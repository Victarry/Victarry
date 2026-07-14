const API_ROOT = "https://api.github.com";
const API_VERSION = "2022-11-28";

function headers(token) {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "victarry-profile-readme",
    "X-GitHub-Api-Version": API_VERSION,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function githubJson(pathOrUrl, { token, fetchImpl = fetch } = {}) {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${API_ROOT}${pathOrUrl}`;
  const response = await fetchImpl(url, {
    headers: headers(token),
    signal: AbortSignal.timeout(7000),
  });

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status} for ${new URL(url).pathname}`);
  }

  return response.json();
}

function repoFromApiUrl(url = "") {
  return url.split("/repos/")[1] || "GitHub";
}

function compactRepo(fullName = "GitHub") {
  const [owner, repo] = fullName.split("/");
  return owner === "NVIDIA" || owner === "Victarry" ? repo : fullName;
}

function uniqueBy(items, key) {
  const seen = new Set();
  return items.filter((item) => {
    const value = key(item);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function trimCommitSubject(message = "") {
  return message.split("\n")[0].replace(/^Merge pull request #[0-9]+ from .+$/i, "Merged changes");
}

async function mergedPullRequests(username, options) {
  const query = encodeURIComponent(`type:pr author:${username} is:merged`);
  const data = await githubJson(
    `/search/issues?q=${query}&sort=updated&order=desc&per_page=12`,
    options,
  );

  return data.items.map((item) => {
    const fullRepo = repoFromApiUrl(item.repository_url);
    return {
      id: `merged-${fullRepo}-${item.number}`,
      date: item.closed_at || item.updated_at,
      type: "MERGED PR",
      repo: compactRepo(fullRepo),
      description: item.title,
      url: item.html_url,
    };
  });
}

async function publicActivity(username, options) {
  const events = await githubJson(`/users/${username}/events/public?per_page=100`, options);

  const reviewEvents = uniqueBy(
    events.filter(
      (event) =>
        event.type === "PullRequestReviewEvent" &&
        event.payload?.action === "created" &&
        event.payload?.review?.state !== "pending",
    ),
    (event) => `${event.repo.name}#${event.payload.pull_request.number}`,
  ).slice(0, 2);

  const hydratedReviews = await Promise.allSettled(
    reviewEvents.map(async (event) => {
      const pr = await githubJson(event.payload.pull_request.url, options);
      return {
        id: `review-${event.repo.name}-${pr.number}`,
        date: event.payload.review.submitted_at || event.created_at,
        type: "REVIEW",
        repo: compactRepo(event.repo.name),
        description: pr.title || `Reviewed PR #${pr.number}`,
        url: event.payload.review.html_url || pr.html_url,
      };
    }),
  );

  const reviews = hydratedReviews
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  const releases = events
    .filter(
      (event) =>
        event.type === "ReleaseEvent" &&
        ["published", "released", "created"].includes(event.payload?.action),
    )
    .map((event) => ({
      id: `release-${event.repo.name}-${event.payload.release.id}`,
      date: event.payload.release.published_at || event.created_at,
      type: "RELEASE",
      repo: compactRepo(event.repo.name),
      description:
        event.payload.release.name || event.payload.release.tag_name || "Published a release",
      url: event.payload.release.html_url,
    }));

  // Current Events API PushEvent payloads expose the head SHA but may omit the
  // old inline commits array, so hydrate a few heads through the Commits API.
  const pushEvents = events
    .filter((event) => event.type === "PushEvent" && event.payload?.head)
    .slice(0, releases.length ? 0 : 1);
  const hydratedPushes = await Promise.allSettled(
    pushEvents.map(async (event) => {
      const commit = await githubJson(
        `/repos/${event.repo.name}/commits/${event.payload.head}`,
        options,
      );
      return {
        id: `push-${event.repo.name}-${event.payload.head}`,
        date: event.created_at,
        type: "COMMIT",
        repo: compactRepo(event.repo.name),
        description: trimCommitSubject(commit.commit?.message || "Pushed changes"),
        url: commit.html_url,
      };
    }),
  );
  const pushes = hydratedPushes
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  return { reviews, releases, pushes };
}

export function selectActivity({ merged = [], reviews = [], releases = [], pushes = [] }) {
  const selected = [
    ...merged.slice(0, 2),
    ...reviews.slice(0, 2),
    ...(releases.length ? releases.slice(0, 1) : pushes.slice(0, 1)),
  ];

  return uniqueBy(selected, (item) => item.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
}

export async function fetchGithubActivity({ username = "Victarry", token, fetchImpl } = {}) {
  const options = { token, fetchImpl };
  const [mergedResult, activityResult] = await Promise.allSettled([
    mergedPullRequests(username, options),
    publicActivity(username, options),
  ]);

  if (mergedResult.status === "rejected" && activityResult.status === "rejected") {
    throw new AggregateError(
      [mergedResult.reason, activityResult.reason],
      "All GitHub activity sources failed",
    );
  }

  return selectActivity({
    merged: mergedResult.status === "fulfilled" ? mergedResult.value : [],
    ...(activityResult.status === "fulfilled"
      ? activityResult.value
      : { reviews: [], releases: [], pushes: [] }),
  });
}
