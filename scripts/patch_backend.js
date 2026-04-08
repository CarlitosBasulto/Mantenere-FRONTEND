const fs = require('fs');
const path = require('path');

const backendDir = path.resolve(__dirname, '../../Mantenere-BACKEND/mantenere-backend');
const controllerPath = path.join(backendDir, 'app/Http/Controllers/Api/NegocioController.php');
const apiPath = path.join(backendDir, 'routes/api.php');

if (!fs.existsSync(backendDir)) {
    console.error('Backend directory not found at:', backendDir);
    process.exit(1);
}

// 1. Patch NegocioController.php
let controllerCode = fs.readFileSync(controllerPath, 'utf8');
if (!controllerCode.includes('public function uploadImage')) {
    const uploadMethod = `

    // 📤 Subir imagen y retornar URL
    public function uploadImage(Request $request)
    {
        \$request->validate([
            'foto' => 'required|image|max:10240'
        ]);

        if (\$request->hasFile('foto')) {
            \$path = \$request->file('foto')->store('negocios', 'public');
            return response()->json([
                'url' => '/storage/' . \$path
            ]);
        }

        return response()->json(['message' => 'Error al subir la imagen'], 400);
    }
`;
    // Find the last closing brace of the class
    const lastBraceIndex = controllerCode.lastIndexOf('}');
    controllerCode = controllerCode.substring(0, lastBraceIndex) + uploadMethod + "\n}\n";
    fs.writeFileSync(controllerPath, controllerCode);
    console.log('NegocioController patched.');
} else {
    console.log('NegocioController already patched.');
}

// 2. Patch api.php
let apiCode = fs.readFileSync(apiPath, 'utf8');
const searchString = "Route::put('/negocios/{id}', [NegocioController::class , 'update']);";
const patchString = "\nRoute::post('/upload-imagen', [NegocioController::class, 'uploadImage']);";

if (!apiCode.includes('/upload-imagen')) {
    apiCode = apiCode.replace(searchString, searchString + patchString);
    fs.writeFileSync(apiPath, apiCode);
    console.log('api.php patched.');
} else {
    console.log('api.php already patched.');
}
