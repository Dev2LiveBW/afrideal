# Image Fetching and Local Asset Rule

When asked to fetch or download images for the project:
1. **Search:** Use the `unsplash` MCP tool to search for the best-matching high-resolution image URL.
2. **Download:** Immediately use shell execution (`curl` or `fetch`) to download the full image into the project assets directory (`public/images/` or `src/assets/`).
3. **Naming:** Save the file using clean kebab-case (e.g., `tokyo-night-hero.jpg`).
4. **Attribution:** Log the photographer credit and Unsplash link in `ASSETS_CREDITS.md` or as a comment in the file using the image.
5. **Output:** Return the relative local path (e.g., `/images/tokyo-night-hero.jpg`) ready for use in code.
