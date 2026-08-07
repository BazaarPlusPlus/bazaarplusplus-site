# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues in `BazaarPlusPlus/bazaarplusplus-site`. Use the `gh` CLI; run it inside the clone and it infers the repo.

Repo-specific conventions on top of the standard `gh issue` commands:

- Pass multi-line bodies through a heredoc rather than an inline `--body` string.
- Listing for triage or bulk reading needs the fields projected explicitly, since `gh` omits comments and flattens labels by default:

  ```bash
  gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'
  ```

- External PRs are not a request surface here — triage runs over issues only.
- The only triage label currently defined in the repo is `wontfix`. Create a label before applying it.

When a skill says "publish to the issue tracker", create a GitHub issue. When it says "fetch the relevant ticket", run `gh issue view <number> --comments`.
