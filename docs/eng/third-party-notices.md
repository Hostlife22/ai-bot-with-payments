# Third-party components

**English** · [Русский](../ru/third-party-notices.md) · [简体中文](../zh/third-party-notices.md)

The complete inventory and upstream LICENSE/NOTICE texts are in [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md). Notices remain in their copyright holders' original language; localized guides do not replace them.

## Regeneration

```sh
npm install
npm run docs:notices
```

The generator reads the installed transitive runtime tree and direct development tools, using package metadata and available notice files without a network search. Output records installed versions, declared licenses, installation platform, and the lockfile SHA-256. Identical texts are included once with all sources listed.

Some published artifacts omit license/notice files. They are listed separately; copyright statements and texts from other releases are not invented. Review those exact upstream releases before distribution.

Optional native dependencies differ by platform. Regenerate in a separate environment matching the target distribution. Transitive development tools are outside the inventory's scope.

## Project license

Project code uses [MIT](../../LICENSE); libraries retain their own terms. Photos and external API output require separate consideration of usage rights. Include manifest and notice updates in dependency-update PRs; the generated local lockfile is not committed.
