const bumpVersion = (version: string): string => {
    const [major, minor, patch] = version.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
};

const updateDenoJsonVersion = async () => {
    const filePath = 'deno.json';
    const denoConfig = JSON.parse(Deno.readTextFileSync(filePath));
    const currentVersion = denoConfig.version;
    const newVersion = bumpVersion(currentVersion);
    denoConfig.version = newVersion;
    Deno.writeTextFileSync(filePath, JSON.stringify(denoConfig, null, 2));
    console.log(`Version bumped from ${currentVersion} to ${newVersion}`);
};

updateDenoJsonVersion();
