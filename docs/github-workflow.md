# GitHub Workflow

## Branches

- `main`: stable branch for demos and milestones
- `develop`: shared integration branch
- `feature/module-1-registry`
- `feature/module-2-monitoring`
- `feature/module-3-incidents`
- `feature/module-4-governance`

## Recommended Flow

1. Branch from `develop` into your module branch.
2. Work only in your module folders unless agreed otherwise.
3. Open a pull request into `develop`.
4. Let the integration lead review cross-module changes.
5. Merge `develop` into `main` only when the app is stable.

## Protection Rules To Add On GitHub

1. Protect `main` from direct pushes.
2. Require pull requests for `main`.
3. Prefer pull requests for `develop` as well.
4. Require at least one reviewer for shared-file changes.