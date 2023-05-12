let NumerosTelefonico = {};
let guia = "";


const defaultEstado = { encendido: true };


const getEstado = (numeroTelefono) => {
    return NumerosTelefonico[numeroTelefono] || defaultEstado
  };


const MetaProvider = require('@bot-whatsapp/provider/meta')
const JsonFileAdapter = require('@bot-whatsapp/database/json')
const { createBot, createProvider, createFlow, addKeyword, EVENTS, addChild} = require('@bot-whatsapp/bot')
const axios = require("axios")
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

// Si pasa una hora el bot se vuelve a encender automaticamente
const tiempoApagado = 3600000; // tiempo en milisegundos (5 minutos en este ejemplo)
//-------------------------------------------------------------------------------------------------------
//flujo secundario
//-------------------------------------------------------------------------------------------------------
    const flowAsesor1 = addKeyword(['Soporte técnico','Información sobre productos o servicios','Reportar un problema','Conocer sobre promociones o descuentos','Cancelar un servicio o producto','Hacer una sugerencia o comentario','Otro'])
    .addAnswer(['Se va a derivar esta conversacion a un agente','¿Esta de acuerdo?'],
        {capture: true, buttons: [{body: '✅ Confirmar  Solicitud ' },{ body: '❌ Cancelar solicitud' }],},
            
        async (ctx, { flowDynamic, endFlow, fallBack }) => {
            if (ctx.body == '❌ Cancelar solicitud')
                return endFlow({body: '❌ Su solicitud ha sido cancelada ❌', 
                    buttons:[{body:'⬅️ Volver al Inicio' }]
                })
            else if (ctx.body == '✅ Confirmar  Solicitud ')
                return flowDynamic(`*En breve un agente se contactara con usted*`,)
            else return fallBack()        
        },

    )


    const flowAsesor = addKeyword(['🙋🏻‍♂️ Contactar un asesor'],{sensitive: true})
        .addAction(
            async(ctx,{endFlow,flowDynamic})=>{
                if (ctx.body=='⬅️ Volver al Inicio')
                    return endFlow()
                else flowDynamic()    
            }
        )
        .addAnswer(
            ['*¿Cual es el motivo de su consulta?*'],null,null,[flowAsesor1]
        )
        .addAction(async(ctx, {provider,flowDynamic},) =>{
            const id = ctx.key.remoteJid
            const sections = [
                {
                title: "Selecione una opcion",
                rows: [
                    {title: "Soporte técnico",},
                    {title: "Información sobre productos o servicios"},
                    {title: "Reportar un problema"},
                    {title: "Conocer sobre promociones o descuentos"},
                    {title: "Cancelar un servicio o producto"},
                    {title: "Hacer una sugerencia o comentario"},
                    {title: "Otro"},
                ]
                }
            ]
            const listMessage = {
                text: "Selecciona una de las opciones",
                buttonText: "Opciones",
                sections,
            }
            const a = await provider.getInstance()
            await a.sendMessage(id, listMessage)
            }
        )
    
    const flowEstado2 = addKeyword (EVENTS.WELCOME)
        .addAction(
            async(ctx,{flowDynamic,fallBack,endFlow}) =>{
                if (guia != 1)
                    return fallBack({body:`No encontramos ninguna compra vinculada al codigo de referencia: "${guia}"\nAsegurate que el codigo este bien escrito, intenta nuevamente o contacta un asesor`
                    })
                else
                    return endFlow ({body: '¡Tu compra esta en camino', 
                    buttons:[{body:'⬅️ Volver al Inicio' }]
                })
                },
    
        )    

//-------------------------------------------------------------------------------------------------------
//flujo primario
//-------------------------------------------------------------------------------------------------------
    //-----------------------Flows para apagar y prender el bot---------------------------------
    const flujoApagar = addKeyword('✅ Confirmar  Solicitud ')
    .addAction(async (ctx) => {
        NumerosTelefonico[ctx.from] = { ...NumerosTelefonico[ctx.from], encendido: false }

        setTimeout(() => {
            NumerosTelefonico[ctx.from] = { ...NumerosTelefonico[ctx.from], encendido: true }
            console.log('==========>El Bot se a activado<==========')
        }, tiempoApagado);
    });

    const flujoPrender = addKeyword('¡Hasta luego!')
        .addAction(async (ctx) => {
        NumerosTelefonico[ctx.from] = { ...NumerosTelefonico[ctx.from], encendido: true }
        })
        .addAnswer(
            ['*El chat con Agente ha finalizado*\nSi tiene alguna otra duda no dudes en contactarnos nuevamente'],
            {buttons:[{body:'⬅️ Volver al Inicio' }]}
        )
    //-------------------------------------------------------------------------------------------------------
    //-----------------------flows menu----------------------------------------------
    const flowMenu = addKeyword([EVENTS.WELCOME,'⬅️ Ir al inicio'])
    //comprueba si el bot esta activo
    .addAction(async (ctx, {flowDynamic, endFlow}) => {
        const numeroTelefono = ctx.from 
        console.log(`Revisando si ${numeroTelefono} está encendido...`)
    
        const estado = getEstado(numeroTelefono)
        if (!estado.encendido) {
        console.log(`Bot apagado para ${numeroTelefono}.`)
        return endFlow()
        }
        
        console.log(`Bot encendido para ${numeroTelefono}.`)
    })
    .addAction(async(ctx, {provider}) =>{
            console.log(ctx.body)
            const id = ctx.from

            const listMessage = {
                "interactive":{
                 "type": "list",
                 "header": {
                    "type": "text",
                    "text": "*¡Hola!* Bienvenid@👋🏻"
                },
                "body": {
                    "text": "Soy el Asistente Virtual de *Gangnam* 👨🏻‍💻.A continuación, indícame que opcion necesitas:"
                },
                "footer": {
                    "text": "your-footer-content"
                },
                "action": {
                    "button": "Menu",
                    "sections":[
                        {
                            "title": " Menu",
                            "rows": [
                                {
                                    "id" : "boton1",
                                    "title": " Encender Bot",
                                    "description": "Hola"
                                },
                                {
                                    "id" : "boton2",
                                    "title": " Encender Bot",
                                    "description": "Hola"
                                },
                                {
                                    "id" : "boto3",
                                    "title": " Encender Bot",
                                    "description": "Hola"
                                },
                                {
                                    "id" : "boton4",
                                    "title": " Encender Bot",
                                    "description": "Hola"
                                }
                            ]
                    
                        },
                    ]
                }
            }}
            const meta = await provider
            await meta.sendLists(id, listMessage)
            return
        }
    )
    
    const flowProductos = addKeyword(['🔍 Productos','1'],{sensitive: true})
    //comprueba si el bot esta activo
    .addAction(async (ctx, {flowDynamic, endFlow}) => {
        const numeroTelefono = ctx.from 
    
        const estado = getEstado(numeroTelefono)
        if (!estado.encendido) {
        return endFlow()
        }
        
    })
    .addAnswer(
        ['Bienvenido a nuestro catálogo de productos. ¿Qué tipo de producto estás buscando hoy? Puedes escribir el tipo de producto (ej. zapatos, ropa, accesorios, etc.) o utilizar uno de los siguientes comandos:',
        " ",
        '"Ver catálogo": para ver todos los productos disponibles.',
        '"Buscar [palabra clave]": para buscar productos por palabra clave.'],
        null,
        null,
    )

    const flowMedios = addKeyword(['💳 Medios de Pago','2'],{sensitive: true})
    //comprueba si el bot esta activo
    .addAction(async (ctx, {flowDynamic, endFlow}) => {
        const numeroTelefono = ctx.from 
    
        const estado = getEstado(numeroTelefono)
        if (!estado.encendido) {
        return endFlow()
        }
        
    })
    .addAnswer(
        ['Aceptamos diferentes medios de pago para tu comodidad. Puedes pagar tus compras con tarjeta de crédito, transferencia bancaria o pago en efectivo en nuestras tiendas físicas. ¿Necesitas información adicional sobre alguno de estos medios de pago?'],
        null,
        null,
    )

    const flowPromo = addKeyword(['📢 Promociones','3'],{sensitive: true})
    //comprueba si el bot esta activo
    .addAction(async (ctx, {flowDynamic, endFlow}) => {
        const numeroTelefono = ctx.from 
    
        const estado = getEstado(numeroTelefono)
        if (!estado.encendido) {
        return endFlow()
        }
        
    })
    .addAnswer(
        ['Mantente al tanto de nuestras promociones y descuentos especiales. ¡Suscríbete a nuestra lista de correos electrónicos o síguenos en nuestras redes sociales para no perderte ninguna oferta!'],
        null,
        null,
    )

    const flowAvisar = addKeyword(['💬 Avisar de un Pago','4'],{sensitive: true})
    //comprueba si el bot esta activo
    .addAction(async (ctx, {flowDynamic, endFlow}) => {
        const numeroTelefono = ctx.from 
    
        const estado = getEstado(numeroTelefono)
        if (!estado.encendido) {
        return endFlow()
        }
        
    })
    .addAnswer(
        ['Gracias por realizar tu pago. Por favor, envíanos un mensaje con una imagen o foto del comprobante de tu pago y con gusto te ayudaremos a verificarlo.'],
        null,
        null,
    )

const flowEstado = addKeyword(['📦 Estado de tu envío','5'],{sensitive: true})
    //comprueba si el bot esta activo
    .addAction(async (ctx, {flowDynamic, endFlow}) => {
        const numeroTelefono = ctx.from 
    
        const estado = getEstado(numeroTelefono)
        if (!estado.encendido) {
        return endFlow()
        }
        
    })
    .addAnswer(
        ['Para verificar el estado de tu envío, por favor ingresa tu codigo de referencia.'],
        {capture: true, buttons: [{ body: '❌ Cancelar solicitud' }],},
        
        async (ctx, { flowDynamic, endFlow }) => {
            if (ctx.body == '❌ Cancelar solicitud')
            return endFlow({body: '❌ Su solicitud ha sido cancelada ❌', 
                buttons:[{body:'⬅️ Volver al Inicio' },{ body: ' 🙋🏻‍♂️ Pedir ayuda' },]
            })
            guia = ctx.body;
            console.log(guia)
            return flowDynamic()
        },
        [flowEstado2]
    )




    const flowFAQs = addKeyword(['❔ Preguntas Frecuentes','6'],{sensitive: true})
    //comprueba si el bot esta activo
    .addAction(async (ctx, {flowDynamic, endFlow}) => {
        const numeroTelefono = ctx.from 
    
        const estado = getEstado(numeroTelefono)
        if (!estado.encendido) {
        return endFlow()
        }
        
    })
    .addAnswer(
        ['Si tienes alguna pregunta frecuente, por favor revisa nuestra sección de preguntas frecuentes en nuestro sitio web o aplicación móvil. Si no encuentras la respuesta que buscas, no dudes en escribirnos.'],
        null,
        null,
    )

    const flowCambio = addKeyword(['🏷️ Cambios y Devoluciones','7'],{sensitive: true})
    //comprueba si el bot esta activo
    .addAction(async (ctx, {flowDynamic, endFlow}) => {
        const numeroTelefono = ctx.from 
    
        const estado = getEstado(numeroTelefono)
        if (!estado.encendido) {
        return endFlow()
        }
        
    })
    .addAnswer(
        ['Lo siento mucho por las molestias. Por favor, háblanos del cambio que deseas realizar y con gusto te ayudaremos a procesarlo. Puedes enviar un correo electrónico a cambios@tiendaderopa.com o escribir "Hacer un cambio" para más información.'],
        null,
        null,
    )

    const flowContacto = addKeyword(['📬 Contacto','🙋🏻‍♂️ Pedir ayuda','8'],{sensitive: true})
    //comprueba si el bot esta activo
    .addAction(async (ctx, {flowDynamic, endFlow}) => {
        const numeroTelefono = ctx.from 
    
        const estado = getEstado(numeroTelefono)
        if (!estado.encendido) {
        return endFlow()
        }
        
    })
    .addAnswer(
        ['Si necesitas contactarnos, Puedes enviarnos un correo electrónico a hola@gangnam.com.ar o puedes usar el boton que se encuentra abajo.',
        ' Estamos disponibles para ayudarte de lunes a viernes de 9am a 6pm.'],
        {   capture:true,
            buttons: [
            { body: '🙋🏻‍♂️ Contactar un asesor' },
            { body: '⬅️ Ir al inicio' } ]},
            async(ctx,{endFlow,flowDynamic})=>{
                
            }
            ,
        [flowAsesor,flowAsesor1,flowMenu]
    )


const main = async () => {
    const adapterDB = new JsonFileAdapter()
    const adapterFlow = createFlow([flowMenu,flowProductos,flowMedios,flowPromo,flowAvisar,flowEstado,flowFAQs,flowCambio,flowContacto,flujoApagar,flujoPrender])
    

    const adapterProvider = createProvider(MetaProvider, {
        jwtToken: process.env.API_KEY,
        numberId: process.env.API_ID,
        verifyToken: process.env.API_VERIFY,
        version: 'v16.0'
    })

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })
}

main()
