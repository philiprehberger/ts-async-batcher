# Changelog

## 0.2.1

- Fix README GitHub URLs to use correct repo name (ts-async-batcher)

## 0.2.0

- Add batch metrics tracking (size distribution, error count, total items)
- Add max queue size limit with overflow strategy
- Add batch prioritization for critical items
- Add retry logic with exponential backoff on batch failure

## 0.1.6

- Standardize README to 3-badge format with emoji Support section
- Update CI actions to v5 for Node.js 24 compatibility
- Add GitHub issue templates, dependabot config, and PR template

## 0.1.5

- Republish under new npm package name

## 0.1.4

- Fix README badge configuration

## 0.1.3

- Add Development section to README
- Fix CI badge to reference publish.yml
- Add test script to package.json

## 0.1.0
- Initial release
- `createBatcher()` with configurable batch size and window
- Key deduplication within batch windows
- `load()` and `loadMany()` methods
