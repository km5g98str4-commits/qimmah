# Sources and URLs

Research date 2026-09-12. **Access caveat:** the research sandbox could open GitHub fully but most manufacturer, marketplace, government and forum pages were blocked by an egress proxy; those entries are marked *(snippet)* — the fact was quoted by a search engine from the page and must be re-confirmed by opening the URL. Primary documents actually read in full are marked **(read in full)**.

## A. Meter documentation (primary)

1. **TUF-2000M User Manual v13.44** — mirrored verbatim in a public repo: https://raw.githubusercontent.com/gambit-labs/challenge/master/docs/tuf-2000m.pdf **(read in full, 56 pp.)** Same document Amazon hosts at https://images-na.ssl-images-amazon.com/images/I/91CvZHsNYBL.pdf *(blocked)*. Used for: power (8–36 VDC/50 mA), accuracy/repeatability, M14 materials, M40/M41/M42/M26, M63 protocol default, Modbus register table, reg 72 bits, reg 92–94, working-step letters, install method, couplant, full-pipe rule.
2. ecefast TUF-2000M datasheet https://www.ecefast.co.nz/wp-content/uploads/2016/08/TUF-2000M_datasheet.pdf *(snippet)* — velocity range, linearity.
3. veto.cl Modbus format note http://blog.veto.cl/com_virtuemart/files/manuales/otros_documentos/N0646058_modbus_formato_datos.pdf *(snippet)*.
4. TDS-100F manual (Intech NZ) https://www.intech.co.nz/wp-content/uploads/Intech-Manual-TDS-100F-Ultrasonic-flow-meter-2.pdf *(snippet)*; TDS-100H spec https://cdn.kempstoncontrols.com/files/54b61470e2f5cada21cd0bc73579d248/TDS-100H.pdf *(snippet)*.

## B. Open-source TUF-2000M readers (read in full)

5. https://github.com/AiltonFidelix/TUF-2000M (Python, minimalmodbus) — register decode.
6. https://github.com/jkkorpi70/TUF2000M (C#) — reg-72 bit table, word order.
7. https://github.com/arivin29/note-rencana — `TUF2000M-REGISTER-MAP.md` (ESP32-S3, Nov 2025, worked example 36.625 °C).
8. https://github.com/playground/auraflow — ESP32 firmware runbook (`docs/hardware.md`, `docs/bring-up.md`).
9. https://github.com/Jusaba/TUF-2000M — Arduino/ESP32 library.
10. https://github.com/gambit-labs/challenge — README decode examples.

## C. Community field reports *(snippet)*

11. https://partofthething.com/thoughts/reading-a-tuf-2000m-ultrasonic-flow-meter-with-an-arduino-or-esp8266/ — 28 mm copper: zero oscillation, drift, "not suitable for relatively small copper pipes".
12. https://www.libe.net/en/flowmeter — Q > 85 needed for stability; bucket test 1.3× low, corrected via M45.
13. https://community.home-assistant.io/t/tuf-2000m-ultrasonic-water-flowmeter-modbus-integration/459931 and thread 734213 — 22 mm pipe difficulty, ESPHome FP32 configs.
14. https://forum.arduino.cc/t/arduino-modbus-rtu-rs485-with-tuf-2000m/511627 — working Modbus RTU read.

## D. Alternatives *(snippet unless noted)*

15. Keyence FD-Q https://www.keyence.com/products/process/flow/fd-q/ ; models https://www.keyence.com/products/process/flow/fd-q/models/ ; manual https://www.watertechusa.com/userdata/userfiles/file/Equipment%20Files/keyence-FD-Q32C-manual.pdf ; prices https://www.omnilyte.com/products/fd-q-series-clamp-on-digital-ultrasonic-flow-sensor , https://www.radwell.com/en-US/Buy/KEYENCE%20CORP/KEYENCE%20CORP/FD-Q10C/
16. Sonotec SONOFLOW CO.55 / SEMIFLOW CO.65 https://www.sonotecusa.com/products/non-invasive-fluid-monitoring/flow-rate-measurement/sonoflow-clamp-on-sensor/
17. Bürkert 8098 FLOWave https://www.valvesonline.co.uk/burkert-type-8098-flowave-saw-flowmeter.html ; https://www.radwell.com/Buy/BURKERT/BURKERT/8098%20FLOWAVE
18. Flexim FLUXUS https://www.nriparts.com/products/flexim-fluxus-f721-other-flow-meters/776644 ; Flexim ME https://www.oilandgasdirectory.com/profile/details/33006/FLEXIM-Middle-East.html ; rentals https://www.atecorp.com/products/flexim
19. Siemens SITRANS FS230 https://www.lesman.com/siemens-sitrans-fs230-clamp-on-ultrasonic-flowmeter
20. Titan Atrato 760 https://uk.rs-online.com/web/p/flow-sensors/1366375
21. Badger Dynasonics DXN https://www.instrumart.com/products/38784/dynasonics-dxn-ultrasonic-flow-meter ; TFX-500w https://www.ebay.com/itm/266938425853
22. Micronics U1000 https://clamponflow.com/products/micronics-ultraflo-u1000-clamp-on-flow-meter/ ; Katronic KATflow 100 https://www.katronic.com/products/stationary-ultrasonic-flow-meter-katflow-100/
23. TDS-100M https://www.amazon.com/Graigar-TDS-100M-S2-Ultrasonic-0-59-3-93in-Transducers/dp/B07C8ML9JF ; TDS-100F https://www.amazon.com/Graigar-Ultrasonic-TDS-100F-S2-DN15-100mm-Wall-Mount/dp/B07NQDLZ67
24. YF-S201 (inline reference only) https://www.amazon.sa/-/en/HALJIA-YF-S201-Counter-Control-Flowmeter/dp/B073VJPQ9W

## E. Saudi pricing / availability *(snippet)*

25. amazon.sa TUF-2000H handheld SAR 502.50 https://www.amazon.sa/-/en/TAKOIL-TUF-2000H-Hand-held-Strengthened-Ultrasonic/dp/B0BLS2K6MS
26. AliExpress TUF-2000M-TS-2 $100.70 https://www.aliexpress.com/item/32518776067.html ; TM-1 https://www.aliexpress.com/item/32449762433.html
27. Alibaba TUF-2000M RS485 https://www.alibaba.com/product-detail/TUF-2000M-RS485-Modbus-Ultrasonic-Flow_1749852634.html ; https://www.alibaba.com/product-detail/TUF-2000M-Cheap-price-module-ultrasonic-60644088142.html
28. KSA import VAT/duty https://dutydecoder.com/saudi-arabia/duty-free-threshold/ ; https://www.stackry.com/duties-and-taxes/saudi-arabia ; AliExpress→KSA https://affordablething.com/aliexpress-saudi-arabia/
29. amazon.sa returns https://www.amazon.sa/-/en/gp/help/customer/display.html?nodeId=GKM69DUUYKQWKWX7
30. RS485 modules: MAX485 https://www.amazon.sa/-/en/Aihasd-MAX485-Converter-Module-Arduino/dp/B017KNMVYM ; MAX3485 https://www.amazon.sa/-/en/KNACRO-RS485-TTL-Overvoltage-protectionWith/dp/B07V5LND1T ; auto-dir https://www.amazon.sa/-/en/Youmile-Adapter-Module-Converter-Arduino/dp/B08BZ8274M ; DFRobot DFR0845 https://wiki.dfrobot.com/dfr0845/ ; ADM2483 https://www.analog.com/en/products/adm2483.html ; 3.3 V caveat https://mischianti.org/interface-arduino-esp8266-esp32-rs-485/
31. BOM items: PSU https://www.amazon.sa/-/en/Universal-adapter-100-240v-supply-charger/dp/B08F7X7KLR ; buck https://www.amazon.sa/-/en/Converter-3-0-40V-1-5-35V-Supply-Module/dp/B07R3S5T6W ; enclosure https://www.amazon.sa/-/en/LeMotech-Waterproof-Dustproof-Electrical-Enclosure/dp/B075X1GY7M ; couplant https://anaum.sa.com/products/phase-ii-utg1000-c , https://www.amazon.sa/-/en/Aquasonic-Ultrasonic-250ml-Ounce-Dispenser/dp/B0837LH4SL ; scale https://www.amazon.sa/-/en/Digital-Kitchen-Scale-5kg-5000g/dp/B07NDP2W7W ; jug https://www.amazon.sa/-/en/Sunnex-Measuring-Jug-1-Litre/dp/B018Q6T34I ; jerry can https://www.amazon.sa/-/en/Jerry-Can-Heavy-Duty-Plastic/dp/B07QRT8G7H ; PPR https://www.youmats.com/en/plumbing/pipe-and-fittings/ppr-pipes-and-fittings/ppr-pipes
32. Local shops: https://rakanelectronics.com/ ; https://etqan.sa/ ; https://khalifaelectronics.com/ ; https://anaum.sa.com/

## F. Borrowing / demo candidates *(snippet)*

33. KFUPM ME fluid lab (GUNT HM 500 + HM 500.05 ultrasonic) https://me.kfupm.edu.sa/facilities-and-resources/thermo-fluid-sciences-group/fluid-mechanics-lab ; https://www.gunt.de/en/products/ultrasonic-flow-meter/070.50005/hm500-05/glct-1:pa-148:pr-897
34. KSU hydraulics lab https://engineering.ksu.edu.sa/en/hydraulics_fluid_mechanics_lab ; IAU fluid lab https://www.iau.edu.sa/en/colleges/college-of-engineering/labs-and-equipment/basic-engineering-laboratories/fluid-mechanics-laboratory ; KAUST core labs https://corelabs.kaust.edu.sa/services/equipment
35. Endress+Hauser Arabia https://www.endress.com/en/endress-hauser-group/endresshauser-at-a-glance/worldwide-network/saudi-arabia ; KROHNE KSA https://www.krohne.com/en-sa/company/krohne-saudi-arabia ; IICS (Abunayyan) https://iics-sa.com/ ; Kanoo Energy https://kanooenergy.com/ksa/process-solutions/instrumentation-and-controls/ultrasonic-flow-meter/ ; Saudi FAL https://www.saudifal.com.sa/flow.aspx

## G. Competition *(snippet; all official pages blocked)*

36. MEWA University Innovation Challenge https://www.mewa.gov.sa/en/Ministry/Agencies/AgencyForInnovation/Topics/UniversityInnovationChallenge/Pages/default.aspx ; SEU notice https://seu.edu.sa/ar/studentsadvertisements/80502025-1/ ; Sabq (2nd edition) https://sabq.org/article/z7TapB5
37. Future Makers (DCO/MEWA/RDIA/KACST) https://saudi.tpg.media/future-makers-challenge-targets-water-resilience/ ; https://cyprus-mail.com/2026/09/12/cyprus-startups-invited-to-tackle-water-challenges-with-ai ; https://newspens.sa/post/50191
38. SWA Global Prize for Innovation in Water https://www.swa.gov.sa/en/news/Prize ; https://www.spa.gov.sa/en/N2634130
39. Name-collision programmes: MoE https://www.moe.gov.sa/ar/mediacenter/MOEnews/Pages/crc-1443-09.aspx ; MEWA sustainability challenge https://eparticipation.my.gov.sa/co-creation/initiatives/innovation-challenge-for-sustainability/

## H. Simulation tools

40. Wokwi docs https://docs.wokwi.com/chips-api/uart ; https://docs.wokwi.com/guides/esp32-wifi ; https://github.com/wokwi/wokwigw
41. pymodbus simulator https://pymodbus.readthedocs.io/en/latest/source/library/simulator/config.html ; mbpoll https://github.com/epsilonrt/mbpoll ; ModbusPal https://modbuspal.sourceforge.net/
42. Espressif QEMU https://github.com/espressif/esp-toolchain-docs/blob/main/qemu/esp32/README.md ; esp-emulator https://github.com/espressif/esp-emulator ; ESP-IDF host apps https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-guides/host-apps.html
43. PlatformIO unit testing https://docs.platformio.org/en/latest/advanced/unit-testing/index.html ; Node-RED Modbus https://flows.nodered.org/node/node-red-contrib-modbus ; SimulIDE ESP32 thread https://simulide.com/p/forum/topic/esp-32-support/ ; MathWorks pricing https://www.mathworks.com/pricing-licensing.html
44. Clamp-on acoustics FEM (out of scope) https://www.researchgate.net/publication/342313147

Full per-fact tagging lives in `research/notes/*.md`.
