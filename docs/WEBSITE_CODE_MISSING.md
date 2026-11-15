# The live website code is not in GitHub

**Status on 15 Nov 2026: still missing.**

The website that customers, vendors and admins use today was built and deployed from the
owner's computer (the Antigravity project folder) around 7–8 Nov 2026. That code was never
pushed to GitHub. The `src/` folder in this repository is an older copy.

How we know: the live website calls backend functions such as `updateVendorOrderStatus`,
`setCourierCharge`, `adminMarkDelivered`, `updateOrderStatus`, `setProductStock` and
`markCodRemitted`. None of those names appear anywhere in the `src/` folder here.

## What this means

- **Do not deploy hosting from this repository.** It would replace the live website with the old one.
- **Do not "fix" `src/` here by guessing.** It has to come from the real folder.
- Backend work that needs a screen is waiting for this. Already built in the backend but not
  yet visible on any screen:
  - payout rows on the vendor order (order value → commission → courier charge → payout)
  - vendor wallet totals for courier charges held
  - admin view of courier charges held against EKART spend
  - weight and box size as required fields in the product form
  - editing the EKART rate card from the admin financial settings screen

## Next step

From the Antigravity project folder on the owner's computer, push the current website code
(`src/`, `public/`, `index.html`, `package.json`, `vite.config.ts`, `firebase.json`,
`firestore.rules`, `storage.rules`) to a new branch, for example `live-website-snapshot`.
Do not push `node_modules`, `dist`, `.env` files or anything containing passwords.
After that it can be reviewed and merged into `main`, and this note can be deleted.
