# Install arch_x64 sharp binaries
echo "Installing arch_x64 binaries for Lambda NPM modules..."
mv node_modules/ node_modules.old/
rm -rf node_modules/ > /dev/null 2>&1
npm install --only=production --arch=x64 --platform=linux sharp > /dev/null 2>&1

# Create ZIP file
echo "Zipping up files..."
zip -r -X build.zip index.js generate.js helpers.js node_modules > /dev/null 2>&1

# Revert npm
echo "Revering back NPM modules..."
rm -rf node_modules/
mv node_modules.old node_modules
