# TFM 2: Trazabilidad Logística con Blockchain

## Plataforma de Trazabilidad Logística para Envíos y Cadena de Suministro

**Máster en Blockchain · Trabajo Final de Máster**

---

## Índice de Contenidos

1. Descripción del Proyecto TFM
2. Contexto del Sector Logístico
3. Problemas Reales a Resolver
4. Aspectos Clave del TFM
5. Componentes Recomendados del MVP
6. Proyectos de Referencia: Chronicled y SUKU
7. Datos de los Proyectos
8. Tecnologías y Modelo de Negocio
9. Cómo Inspirarse sin Copiar

---

## 1. Descripción del Proyecto TFM

**Título provisional:** "Plataforma de Trazabilidad Logística Basada en Blockchain para Envíos y Cadena de Suministro"

El estudiante deberá construir un sistema de trazabilidad logística para monitorizar envíos, paquetes o contenedores a lo largo de toda la cadena de distribución. El objetivo es crear un MVP que permita rastrear cada movimiento del producto desde su origen hasta el destino final, garantizando transparencia y verificabilidad.

### Objetivo Formativo

Implementar un flujo digital verificable que cubra:

- **Origen:** registro del punto de partida del envío
- **Transportista:** asignación y verificación del responsable del transporte
- **Hubs logísticos:** registro de paso por centros de distribución intermedios
- **Entrega final:** confirmación de recepción por el destinatario
- **Sensores IoT (opcional):** temperatura, humedad, golpes, apertura de contenedores

### Resultado Esperado

Un panel estilo "tracking DHL/UPS" que muestre movimientos, estados y verificaciones on-chain, junto con smart contracts para gestionar eventos logísticos de forma automática y verificable.

---

## 2. Contexto del Sector Logístico

La logística global gestiona millones de envíos diarios: medicamentos, piezas industriales, alimentos, dispositivos electrónicos, productos de lujo y más. La trazabilidad logística es fundamental para:

- Certificar el origen de productos sensibles (medicamentos, tecnología)
- Garantizar que un paquete no fue manipulado durante el transporte
- Controlar temperatura en cadena de frío (vacunas, alimentos perecederos)
- Evitar falsificaciones en productos de alto valor
- Cumplir con regulaciones internacionales de transporte

### Tipos de Productos que Requieren Trazabilidad

| **Sector** | **Ejemplos** |
| --- | --- |
| **Farmacéutico** | Medicamentos, vacunas, dispositivos médicos |
| **Alimentario** | Productos refrigerados, carnes, lácteos |
| **Electrónica** | Componentes, dispositivos, semiconductores |
| **Lujo** | Relojes, joyas, obras de arte, vinos premium |
| **Industrial** | Piezas automotrices, maquinaria, equipos |

---

## 3. Problemas Reales a Resolver

### Intermediarios sin Trazabilidad

Múltiples transportistas y hubs logísticos que no reportan correctamente el estado de los envíos o no comparten información entre sí.

### Falsificación de Productos

Especialmente crítico en sectores farmacéutico y de lujo. Se estima que el 10% de los medicamentos en países en desarrollo son falsificados.

### Falta de Visibilidad en Tiempo Real

Los compradores no saben dónde está realmente su envío, solo reciben actualizaciones esporádicas que pueden no ser precisas.

### IoT Desconectado

Sensores de temperatura, humedad o golpes que generan datos, pero no están integrados con sistemas blockchain para auditoría inmutable.

### Registros Modificables

Bases de datos centralizadas donde los registros pueden ser alterados después del hecho, eliminando la posibilidad de auditoría confiable.

---

## 4. Aspectos Clave a Tener en Cuenta en el TFM

### 1. Trazar un Envío en Varias Etapas

Flujo básico: **Origen → hub intermedio → transportista → destino final**

### 2. Registro de Eventos

Eventos críticos a registrar:

- Salida del origen
- Llegada a hub logístico
- Escaneo de paquete
- Incidencias (daños, retrasos, aperturas no autorizadas)
- Entrega final

### 3. Integración IoT (Opcional)

Sensores que pueden integrarse:

- **Temperatura:** crítico para cadena de frío
- **Golpes:** acelerómetro para detectar caídas o maltrato
- **Humedad:** para productos sensibles a condiciones ambientales
- **Apertura:** detectores de puertas/contenedores abiertos

### 4. Certificación para Mercados Regulados

Especialmente importante en:

- Farmacéutico (cumplimiento DSCSA en EE.UU., GDP en Europa)
- Médico (dispositivos y equipos)
- Productos de lujo (autenticidad y proveniencia)

### 5. Interoperabilidad

API para consultar estado del envío desde sistemas externos (ERP, WMS, CRM)

### 6. Roles y Permisos

Definir claramente los actores:

- **Remitente:** crea el envío
- **Transportista:** actualiza ubicación y estado
- **Hub logístico:** confirma recepción y salida
- **Destinatario:** confirma entrega
- **Auditor:** solo lectura para verificación

---

## 5. Componentes Recomendados del MVP

### 5.1. Smart Contract

El contrato inteligente debe incluir como mínimo las siguientes estructuras:

```solidity
// ⚠️ TU TAREA: Definir estos enums
enum ShipmentStatus { Created, InTransit, AtHub, OutForDelivery, Delivered, Returned, Cancelled }
enum ActorRole { None, Sender, Carrier, Hub, Recipient, Inspector }
enum IncidentType { Delay, Damage, Lost, TempViolation, Unauthorized }

// ⚠️ TU TAREA: Implementar estos structs
struct Shipment {
    uint256 id;
    address sender;
    address recipient;
    string product;
    string origin;
    string destination;
    uint256 dateCreated;
    uint256 dateDelivered;
    ShipmentStatus status;
    uint256[] checkpointIds;
    uint256[] incidentIds;
    bool requiresColdChain;    // Si requiere temperatura controlada
}

struct Checkpoint {
    uint256 id;
    uint256 shipmentId;
    address actor;
    string location;
    string checkpointType;     // "Pickup", "Hub", "Transit", "Delivery"
    uint256 timestamp;
    string notes;
    int256 temperature;        // Temperatura en celsius * 10 (para decimales)
}

struct Incident {
    uint256 id;
    uint256 shipmentId;
    IncidentType incidentType;
    address reporter;
    string description;
    uint256 timestamp;
    bool resolved;
}

struct Actor {
    address actorAddress;
    string name;
    ActorRole role;
    string location;
    bool isActive;
}

// Variables de estado
address public admin;
uint256 public nextShipmentId = 1;
uint256 public nextCheckpointId = 1;
uint256 public nextIncidentId = 1;

// Mappings
mapping(uint256 => Shipment) public shipments;
mapping(uint256 => Checkpoint) public checkpoints;
mapping(uint256 => Incident) public incidents;
mapping(address => Actor) public actors;

// Eventos
event ShipmentCreated(uint256 indexed shipmentId, address indexed sender, address indexed recipient, string product);
event CheckpointRecorded(uint256 indexed checkpointId, uint256 indexed shipmentId, string location, address actor);
event ShipmentStatusChanged(uint256 indexed shipmentId, ShipmentStatus newStatus);
event IncidentReported(uint256 indexed incidentId, uint256 indexed shipmentId, IncidentType incidentType);
event IncidentResolved(uint256 indexed incidentId);
event DeliveryConfirmed(uint256 indexed shipmentId, address indexed recipient, uint256 timestamp);
event ActorRegistered(address indexed actorAddress, string name, ActorRole role);

// ⚠️ TU TAREA: Programar estas funciones principales

// Gestión de Actores
function registerActor(string memory _name, ActorRole _role, string memory _location) public;
function getActor(address _actorAddress) public view returns (Actor memory);
function deactivateActor(address _actorAddress) public;

// Gestión de Envíos
function createShipment(address _recipient, string memory _product, string memory _origin, string memory _destination, bool _requiresColdChain) public returns (uint256);
function getShipment(uint256 _shipmentId) public view returns (Shipment memory);
function updateShipmentStatus(uint256 _shipmentId, ShipmentStatus _newStatus) public;
function confirmDelivery(uint256 _shipmentId) public;
function cancelShipment(uint256 _shipmentId) public;

// Gestión de Checkpoints
function recordCheckpoint(uint256 _shipmentId, string memory _location, string memory _checkpointType, string memory _notes, int256 _temperature) public returns (uint256);
function getCheckpoint(uint256 _checkpointId) public view returns (Checkpoint memory);
function getShipmentCheckpoints(uint256 _shipmentId) public view returns (Checkpoint[] memory);

// Gestión de Incidencias
function reportIncident(uint256 _shipmentId, IncidentType _incidentType, string memory _description) public returns (uint256);
function resolveIncident(uint256 _incidentId) public;
function getIncident(uint256 _incidentId) public view returns (Incident memory);
function getShipmentIncidents(uint256 _shipmentId) public view returns (Incident[] memory);

// Funciones auxiliares
function getActorShipments(address _actor) public view returns (uint256[] memory);
function verifyTemperatureCompliance(uint256 _shipmentId) public view returns (bool);

```

### 5.2. Modelo de Datos

Estructura JSON recomendada para cada evento:

```json
{
  "shipmentId": "PKG-2024-001",
  "product": "Medicamento refrigerado",
  "origin": "Laboratorio FarmaTech",
  "destination": "Hospital Central",
  "event": "Hub logístico Madrid",
  "timestamp": 1710002212,
  "temperature": 4.5,
  "actor": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"
}

```

### 5.3. Tests Recomendados (sc/test/LogisticsTracking.t.sol)

```solidity
// ⚠️ TU TAREA: Escribir y hacer pasar estos tests
contract LogisticsTrackingTest is Test {
    // Setup y configuración inicial
    function setUp() public { }

    // Tests de gestión de actores
    function testRegisterSender() public { }
    function testRegisterCarrier() public { }
    function testRegisterHub() public { }
    function testRegisterRecipient() public { }
    function testDeactivateActor() public { }

    // Tests de creación de envíos
    function testCreateShipment() public { }
    function testCreateShipmentWithColdChain() public { }
    function testShipmentIdIncrementation() public { }
    function testGetShipment() public { }
    function testOnlySenderCanCreateShipment() public { }

    // Tests de checkpoints
    function testRecordPickupCheckpoint() public { }
    function testRecordHubCheckpoint() public { }
    function testRecordTransitCheckpoint() public { }
    function testRecordDeliveryCheckpoint() public { }
    function testRecordCheckpointWithTemperature() public { }
    function testGetShipmentCheckpoints() public { }
    function testCheckpointTimeline() public { }

    // Tests de actualización de estado
    function testUpdateStatusToInTransit() public { }
    function testUpdateStatusToAtHub() public { }
    function testUpdateStatusToOutForDelivery() public { }
    function testUpdateStatusToDelivered() public { }
    function testStatusChangeEmitsEvent() public { }

    // Tests de confirmación de entrega
    function testConfirmDeliveryByRecipient() public { }
    function testOnlyRecipientCanConfirmDelivery() public { }
    function testDeliveryUpdatesTimestamp() public { }
    function testCannotConfirmDeliveryTwice() public { }

    // Tests de incidencias
    function testReportDelayIncident() public { }
    function testReportDamageIncident() public { }
    function testReportLostIncident() public { }
    function testReportTempViolation() public { }
    function testResolveIncident() public { }
    function testGetShipmentIncidents() public { }
    function testUnresolvedIncidentsList() public { }

    // Tests de temperatura
    function testVerifyTemperatureComplianceValid() public { }
    function testVerifyTemperatureComplianceViolation() public { }
    function testColdChainMonitoring() public { }

    // Tests de cancelación
    function testCancelShipment() public { }
    function testOnlySenderCanCancelShipment() public { }
    function testCannotCancelDeliveredShipment() public { }

    // Tests de validaciones
    function testCannotRecordCheckpointForNonExistentShipment() public { }
    function testCannotReportIncidentForNonExistentShipment() public { }
    function testInactiveActorCannotRecordCheckpoint() public { }

    // Tests de casos edge
    function testMultipleCheckpointsForSameShipment() public { }
    function testShipmentWithMultipleIncidents() public { }
    function testEmptyCheckpointNotes() public { }

    // Tests de flujo completo
    function testCompleteShippingFlow() public { }
    function testPharmaceuticalColdChainFlow() public { }
    function testMultiHubLogisticsFlow() public { }
}
```

### 5.4. Arquitectura Recomendada

Componentes técnicos sugeridos:

- **Blockchain:** EVM
- **Backend:** Node.js
- **Base de datos:** SQLite / MongoDB
- **Frontend:** React / HTML+JavaScript
- **Smart Contracts:** Solidity
- **IoT (opcional):** Sensores conectados vía MQTT o API REST
- **Mapas:** Leaflet o Google Maps para visualización de rutas

---

## 6. Proyectos de Referencia: Chronicled y SUKU

### 6.1. Chronicled / MediLedger

**¿Qué es?**

Una de las plataformas pioneras en trazabilidad logística usando blockchain para cadenas reguladas, especialmente en el sector farmacéutico y de dispositivos médicos.

**Enlaces oficiales:**

- 🌐 **Sitio web:** [https://www.chronicled.com](https://www.chronicled.com/)

**Problema que resuelve:**

- Fármacos falsificados en la cadena de suministro
- Necesidad de un sistema verificable entre múltiples laboratorios y distribuidores
- Cumplimiento normativo en EE.UU. (Drug Supply Chain Security Act - DSCSA)

**Cómo lo resuelve:**

- Red empresarial (MediLedger) donde laboratorios, distribuidores y otros actores comparten un registro común e inmutable
- Identidad digital descentralizada para empresas
- Verificación de medicamentos y dispositivos
- Sistema de trazabilidad que cumple con regulaciones estrictas

### 6.2. SUKU

**¿Qué es?**

Ecosistema blockchain para supply chain que combina trazabilidad logística con experiencia para el consumidor final e inclusión financiera.

**Enlaces oficiales:**

- 🌐 **Sitio web:** [https://www.suku.world](https://www.suku.world/)
- 🐦 **Twitter/X:** [https://x.com/Suku_world](https://x.com/Suku_world)

**Problema que resuelve:**

- Falta de visibilidad de extremo a extremo en cadenas de suministro complejas
- Riesgo de falsificación en retail
- Desalineación de datos entre múltiples actores
- Inclusión financiera de pequeños proveedores

**Cómo lo resuelve:**

- Herramientas para trazabilidad desde fabricación hasta retail
- Conexión marca-consumidor mediante códigos QR y blockchain
- Experiencias Web3 (NFTs, drops, programas de fidelización)
- Integración con sistemas de pagos (SukuPay)

---

## 7. Datos de los Proyectos

### 7.1. Chronicled - Países y Escala

**Países con operaciones o influencia:**

- **Estados Unidos:** Foco principal en cadena farmacéutica (regulación DSCSA)
- **México:** Cadenas de distribución farmacéutica vinculadas a multinacionales
- **Colombia:** Distribuidores con operaciones binacionales US-Colombia
- **Brasil:** Farmacéuticas multinacionales con estándares interoperables
- **Chile:** Cadenas de distribución que importan medicamentos desde EE.UU.

**Datos económicos:**

- **Financiación:** Aproximadamente 36 millones de dólares
- **Tamaño:** Cercano a 100 empleados
- **Foco:** Red MediLedger para sector life sciences
- **Casos de uso:** Verificación de medicamentos, contratos de rebates, devoluciones

### 7.2. SUKU - Países Latinoamericanos

**Países con proyectos directos:**

- **Chile:** Piloto de trazabilidad de carne con Cencosud
- **Argentina:** Presencia del mismo piloto en tiendas Cencosud
- **Perú:** Expansión potencial del proyecto (Cencosud opera allí)
- **Brasil:** Integración con ecosistema retail y pilotos de trazabilidad
- **Colombia:** Parte de la red de supermercados vinculados al piloto regional
- **Guatemala:** Integración de SukuPay con Banco Industrial para remesas US → Guatemala

**Datos económicos y operativos:**

- **Oficinas:** Silicon Valley, Miami, Atlanta y Uruguay
- **Tamaño inicial:** Unas dos docenas de personas en fases tempranas
- **Casos de uso retail:** Trazabilidad de carne en supermercados Cencosud
- **Tecnología blockchain:** Inicialmente Ethereum, migrado parcialmente a Hedera Hashgraph
- **Productos:** Trazabilidad, identidad digital, pagos transfronterizos (SukuPay)

---

## 8. Tecnologías y Modelo de Negocio

### 8.1. Stack Tecnológico

**Chronicled:**

- Blockchain permissioned (Hyperledger)
- Identidad digital descentralizada
- IoT para monitorización
- APIs para integración con sistemas empresariales

**SUKU:**

- Ethereum / Hedera Hashgraph
- Smart contracts para trazabilidad
- NFTs para experiencias de marca
- Integración con sistemas bancarios (SukuPay)
- APIs para retail y e-commerce

### 8.2. Modelo de Negocio

**Chronicled:**

- Suscripciones empresariales a la red MediLedger
- Tarifas por transacciones verificadas
- Consultoría para cumplimiento regulatorio

**SUKU:**

- SaaS (Software as a Service) para trazabilidad
- Comisiones en pagos transfronterizos (SukuPay)
- Servicios de marca y experiencia consumidor
- Integración con programas de fidelización

---

## 9. Cómo Inspirarse sin Copiar

**IMPORTANTE:** El objetivo de este TFM NO es copiar Chronicled o SUKU, sino usar sus modelos como inspiración para crear tu propia versión adaptada a un caso logístico específico.

### 9.1. Lo que DEBES Hacer

- **Elegir tu propio caso logístico:** No tiene que ser farmacia o retail. Puede ser alimentos refrigerados, componentes electrónicos, productos de lujo, paquetería, etc.
- **Definir tus checkpoints:** Salida → hub → transporte → entrega (adaptado a TU caso)
- **Decidir si incluyes IoT:** ¿Necesitas telemetría real o solo eventos de escaneo?
- **Modelar tu flujo de estados:** Crear tu propio sistema de tracking
- **Pensar en la experiencia:** ¿Qué información necesita ver cada actor?

### 9.2. Lo que NO DEBES Hacer

- ❌ Copiar el código de Chronicled o SUKU (no es open source)
- ❌ Usar exactamente los mismos nombres de contratos y funciones
- ❌ Replicar su modelo de negocio sin adaptación
- ❌ Presentar tu TFM como "Chronicled/SUKU pero con otro nombre"

### 9.3. Ejemplos de Adaptación

**Caso original (Chronicled):**

```
Trazabilidad farmacéutica: Laboratorio → Distribuidor → Mayorista → Farmacia

```

**Tu adaptación (ejemplo con componentes electrónicos):**

```
Trazabilidad de semiconductores: Fábrica → Hub regional → Integrador → Cliente final

```

**Caso original (SUKU):**

```
Trazabilidad de carne: Frigorífico → Cencosud → Consumidor (con QR)

```

**Tu adaptación (ejemplo con productos de lujo):**

```
Trazabilidad de relojes: Manufactura → Distribuidor autorizado → Boutique → Comprador (con certificado NFT)

```

**Tu adaptación (ejemplo con alimentos refrigerados):**

```
Trazabilidad de vacunas: Laboratorio → Aeropuerto → Distribuidor médico → Hospital (con control de temperatura IoT)

```

---

## 10. Ideas de Casos de Uso para tu TFM

### Opción 1: Medicamentos con Control de Temperatura

- Sensores IoT integrados
- Alertas automáticas si se rompe cadena de frío
- Cumplimiento regulatorio farmacéutico

### Opción 2: Componentes Electrónicos de Alto Valor

- Certificado de autenticidad digital
- Trazabilidad para prevenir falsificaciones
- Verificación de origen para semiconductores

### Opción 3: Productos de Lujo (Relojes/Joyas)

- NFT como pasaporte digital del producto
- Historial de propietarios verificable
- Certificados de autenticidad on-chain

### Opción 4: Alimentos Perecederos

- Control de temperatura y humedad
- Timeline de transporte visible
- Certificados sanitarios verificables

### Opción 5: Paquetería Express

- Tracking estilo courier tradicional
- Confirmación de entregas con firma digital
- Gestión de incidencias on-chain