import json
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        # Open the app
        await page.goto('file:///app/index.html')
        # Get data from localStorage
        data = await page.evaluate("localStorage.getItem('deposito_data')")
        if data:
            data = json.loads(data)
            prods = data.get('productos', [])
            print(f"Total productos: {len(prods)}")

            # Check for duplicates by name and code
            seen = {}
            for p in prods:
                key = (p.get('nombre'), p.get('codigo'))
                if key in seen:
                    print(f"DUPLICADO ENCONTRADO: {p.get('nombre')} - {p.get('codigo')}")
                    seen[key].append(p.get('id'))
                else:
                    seen[key] = [p.get('id')]

            # Also check for same name but different code or vice versa
            names = {}
            for p in prods:
                n = p.get('nombre')
                if n in names:
                    names[n].append(p.get('codigo'))
                else:
                    names[n] = [p.get('codigo')]

            for n, codes in names.items():
                if len(set(codes)) > 1:
                    print(f"PRODUCTO CON MISMOS NOMBRE PERO DISTINTOS CÓDIGOS: {n} -> {codes}")

        else:
            print("No hay datos en localStorage")
        await browser.close()

asyncio.run(run())
