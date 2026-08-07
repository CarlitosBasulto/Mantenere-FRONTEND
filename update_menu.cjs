const fs = require('fs');
const path = require('path');

const menuPath = path.join(__dirname, 'src', 'components', 'Menu.tsx');
let content = fs.readFileSync(menuPath, 'utf8');

if (!content.includes('import { normalizeRole')) {
    content = content.replace(
        'import { useAuth } from "../context/AuthContext";',
        'import { useAuth } from "../context/AuthContext";\nimport { normalizeRole } from "../utils/roles";'
    );
}

// Replace role checks
content = content.replace(/const role = user\.role;/g, 'const role = normalizeRole(user.role);');

// `user.role` -> `normalizeRole(user?.role)` in inline checks
// Note: We have to be careful about not replacing `user.role` where it shouldn't be replaced, but actually, all role checks need it.
// E.g. `if (user.role === 'admin')` -> `if (normalizeRole(user.role) === 'admin')`
content = content.replace(/user\?\.role ===/g, 'normalizeRole(user?.role) ===');
content = content.replace(/user\.role ===/g, 'normalizeRole(user.role) ===');

// Replace the old role names with new ones in the file
content = content.replace(/'admin-autonomo'/g, "'propietario-autonomo'");
content = content.replace(/'gerente-general'/g, "'administrador-general'");
content = content.replace(/'encargado'/g, "'gerente-sucursal'");
content = content.replace(/'tecnico'/g, "'tecnico-normal'");

// But wait, it replaces URLs like `/encargado` ? No, those are `/encargado`. But it might replace `'encargado'` if there are hardcoded strings.
// Yes, the prompt says "Nunca más escribir 'admin-autonomo' hardcodeado en ningún archivo."

// Let's replace the route strings as well for encargado -> gerente-sucursal
content = content.replace(/\/encargado/g, "/gerente-sucursal");

// In `getBaseRoute`, it's already using `role` which is now `normalizeRole(user.role)`
// The function:
/*
    const getBaseRoute = () => {
        if (!user) return "/";
        const role = normalizeRole(user.role);
        if (role === 'admin') return "/menu";
        if (role === 'cliente') return "/cliente";
        if (role === 'tecnico-normal') return "/tecnico-normal";
        if (role === 'gerente-sucursal') return "/gerente-sucursal";
        if (role === 'autonomo' || role === 'administrador-general' || role === 'propietario-autonomo') return "/autonomo";
        return "/";
    };
*/
// Wait, `/tecnico` should it be `/tecnico-normal`? The routes in `App.tsx` were kept as `/tecnico`.
// Yes: `<Route path="/tecnico" element={` in App.tsx. So the URL is `/tecnico`.
// This means replacing `'/tecnico'` with `'/tecnico-normal'` might break `/tecnico` if it was doing `navigate("/tecnico")`.
// Oh, `navigate("/tecnico")` uses `"/tecnico"`. My regex `/'tecnico'/g` will only match `'tecnico'` (single quotes).
// `navigate("/tecnico")` uses double quotes usually, or backticks.
// Let's check `Menu.tsx` for `"/tecnico"`.

fs.writeFileSync(menuPath, content);
console.log('Menu.tsx updated successfully');
