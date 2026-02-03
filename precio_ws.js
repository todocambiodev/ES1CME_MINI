import { chromium } from "playwright"

// Funciones principales:
// ---------------------
async function precioTVws(simboloDeseado) {

    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()

    page.on("websocket", (ws) => {
        ws.on("framereceived", async (frame) => {
            // Usamos una RegEx dinámica para el símbolo que elegimos
            const regex = new RegExp(`"${simboloDeseado}"[^}]*?"lp":(\\d+\\.?\\d*)`); // [^}]* -> Significa "cualquier carácter que NO sea una llave de cierre"
            const match = frame.payload.match(regex);

            if (match) {
                //console.log(match[0]);
                const symbol = match[0].split(",")[0].replaceAll('"', "");
                const precio = match[1];
                console.log(`✅ ${symbol}: ${precio} - (${new Date().toLocaleString()})`);
                await verificarSR(precio)
            }
        })

        ws.on("close", async () => {
            try {
                console.log("Websocket cerrado. Recargando página...")
                if (browser.isConnected()) {
                    page.reload({ waitUntil: "load" })
                } else {
                    console.log("Abriendo la pagina de tradinview...")
                    await page.goto("https://www.tradingview.com/chart/", { waitUntil: "load" })
                    await page.keyboard.type(simboloDeseado)
                    await page.keyboard.press("Enter")
                }
            } catch (error) {
                console.log("Error al recargar la página", error)
                console.log("Abriendo la pagina de tradinview...")
                await page.goto("https://www.tradingview.com/chart/", { waitUntil: "load" })
                await page.keyboard.type(simboloDeseado)
                await page.keyboard.press("Enter")
            }
        })
    })

    while (true) {
        try {
            console.log("Abriendo la pagina de tradinview...")
            await page.goto("https://www.tradingview.com/chart/", { waitUntil: "load" })
            await page.keyboard.type(simboloDeseado)
            await page.keyboard.press("Enter")
            break
        } catch (error) {
            console.log("Error al cargar la página", error)
        }
    }
}

async function obtenerSR(sr) {
    try {
        console.log("\nCargando nuevos datos de soportes y resistencias...")
        const url = `https://script.google.com/macros/s/AKfycbyJyyN7WFPtao1u_y8jgwsaKVYf2j8TL4vtg-Xe3kAotmBsUAEyFFjt2K-NgHauYxJjHw/exec?sr=${sr}`
        const respuesta = await fetch(url)
        const datos = await respuesta.json()
        soportes = JSON.parse(datos.soportes)
        resistencias = JSON.parse(datos.resistencias)
        console.log("✅ Datos cargados.")
    } catch (error) {
        console.log("Error al obtener soportes y resistencias", error)
    }
}

async function verificarSR(precio) {

    // Verificamos soportes
    let sopActivosNuevos = []
    for (const soporte of soportes) {
        if (Number(soporte[1]) / factor <= Number(precio) && Number(precio) <= Number(soporte[1]) * factor) {
            console.log(`🔷 Soporte activo de ${soporte[2]} en ${soporte[1]}`)
            sopActivosNuevos.push({ soporte: soporte })
        }
    }
    if (!arraysSonIguales(sopActuales, sopActivosNuevos)) {
        sopActuales = sopActivosNuevos
        console.log("✅ Soportes activos actualizados.✅")
        await enviarPrecio(url, precio)
    }

    // Verificamos resistencias
    let resActivasNuevos = []
    for (const resistencia of resistencias) {
        if (Number(resistencia[1]) / factor <= Number(precio) && Number(precio) <= Number(resistencia[1]) * factor) {
            console.log(`🔶 Resistencia activa de ${resistencia[2]} en ${resistencia[1]}`)
            resActivasNuevos.push({ resistencia: resistencia })
        }
    }
    if (!arraysSonIguales(resActuales, resActivasNuevos)) {
        resActuales = resActivasNuevos
        console.log("✅ Resistencias activas actualizadas.✅")
        await enviarPrecio(url, precio)
    }
}

function arraysSonIguales(arr1, arr2) {
    if (arr1.length !== arr2.length) return false

    // Función auxiliar para convertir a string y comparar
    const sorter = (a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))

    // Creamos copias, ordenamos y comparamos
    const s1 = JSON.stringify([...arr1].sort(sorter))
    const s2 = JSON.stringify([...arr2].sort(sorter))

    return s1 === s2
}

async function enviarPrecio(url, precio) {
    url += `?verificarSR=${precio}`
    console.log("Enviando precio: ", precio)
    const respuesta = await fetch(url, {method: "POST"})
    console.log(await respuesta.text())
}

async function main() {

    Promise.all([
        precioTVws(symbol),
        obtenerSR("sr")
    ])

    // Volver a cargar los datos:
    setInterval(async () => {
        await obtenerSR("sr")
        cicloActual++
        if (cicloActual >= cicloFinal) {
            console.log("✅ Proceso finalizado. Disparando GitHub Actions...")
            process.exit()
        }
    }, minutosParaRecargarSR * 60 * 1000)
}
// ---------------------

// Variables globales:
// ---------------------
const symbol = "VANTAGE:SP500FT"
let url = "https://script.google.com/macros/s/AKfycbz66LZjqBsdyZGCFRJ6Ove4_FdHJrOAhaWEsmlucAn8r9Jsph-Nmo9PzMlAsK-LG9qAHg/exec"
let soportes = []
let resistencias = []
let sopActuales = []
let resActuales = []
const factor = 1.000693
const minutosParaRecargarSR = 1
const cicloFinal = 18
let cicloActual = 0
// ---------------------

// Funciones principales:
// ---------------------
main()
// ---------------------
