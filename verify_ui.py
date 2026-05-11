import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        import os
        path = os.path.abspath("index.html")
        await page.goto(f"file://{path}")

        await page.evaluate("""
            localStorage.setItem('deposito_data', JSON.stringify({
                productos: [
                    {id: '1', nombre: 'Sillón de tres cuerpos con tela de pana color gris topo muy resistente', categoria: 'Sillones', stock: 5, notas: 'Este es un producto de prueba con una descripción muy larga para ver cómo se comporta la interfaz cuando hay mucho texto.', fechaCreado: new Date().toISOString()},
                    {id: '2', nombre: 'Mesa ratona de madera de roble macizo con acabado natural', categoria: 'Mesas', stock: 0, notas: 'Nota corta.', fechaCreado: new Date().toISOString()},
                    {id: '3', nombre: 'Silla Eames Blanca', categoria: 'Sillas', stock: 12, notas: '', fechaCreado: new Date().toISOString()}
                ],
                movimientos: []
            }));
            window.location.reload();
        """)
        await page.wait_for_timeout(1000)

        # Click on the first product to expand it
        await page.click(".stock-item:nth-child(2)") #nth-child(2) because 1 is the cat header
        await page.wait_for_timeout(500)
        await page.screenshot(path="expanded_ui.png", full_page=True)

        # Navigate to "+ Producto" to see if subcategories are gone
        await page.click("nav button:nth-child(4)")
        await page.wait_for_timeout(500)
        await page.screenshot(path="form_ui.png", full_page=True)

        await browser.close()

asyncio.run(main())
