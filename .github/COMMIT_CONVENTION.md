# Commit Convention

Follows [Conventional Commits](https://www.conventionalcommits.org/).

## Format
`<type>(<scope>): <description>`

## Types
- `feat` — new feature
- `fix` — bug fix
- `refactor` — code change, no feature/fix
- `docs` — documentation only
- `test` — adding or updating tests
- `chore` — build, deps, config

## Scope Examples
`auth`, `catalog`, `users`, `media`, `notifications`, `admin`, `frontend`, `backend`, `deps`

## Examples
```
feat(auth): add dealer registration with pending status
fix(catalog): correct price filter to use variant pricing
docs(api): document all auth endpoints
test(pricing): add PBT for non-negative price invariant
chore(deps): pin express to 5.2.1
```
