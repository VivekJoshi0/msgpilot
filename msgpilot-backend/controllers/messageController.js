// const { getClient, isSessionActive } = require('../config/client');
const delay = require('../utils/delay');
const MessageLog = require('../models/MessageLog');
const { setPaused, isPaused, setCancelled, isCancelled, clearAll, clearCancel } = require('../utils/pauseManager');
const { MessageMedia } = require('whatsapp-web.js');
const moment = require('moment');
const ExcelJS = require('exceljs');
const { getClient, isSessionActive } = require('../config/clientManager');


// exports.sendMessage = async (req, res) => {
//     const { message, delayMs = 0 } = req.body;
//     const userId = req.user?.id;
//     const rawNumbers = req.body.numbers;
//     const numbers = Array.isArray(rawNumbers) ? rawNumbers : [rawNumbers];
//     const client = getClient(userId);
//     const countryCode = req.body.countryCode;


//     const active = await isSessionActive(userId);
//     if (!active) {
//         console.log(`🛑 WhatsApp session is not active`);
//         return res.status(440).json({
//             status: false,
//             msg: 'WhatsApp session expired. Please scan QR code again.'
//         });
//     }

//     if (!numbers || !message) {
//         return res.status(400).json({ status: false, msg: 'numbers and message are required' });
//     }

//     // ✅ Clear previous cancel flag so user can send again
//     clearCancel(userId);

//     const total = numbers.length;
//     const io = req.app.get('io');
//     const fixedDelay = 2000;

//     const batchId = moment().format('YYYYMMDD_HHmmss');

//     res.status(200).json({
//         status: true,
//         msg: 'Messages started processing',
//         batchId: batchId
//     });

//     let processed = 0;
//     let success = 0;
//     let failed = 0;
//     let duplicate = 0;
//     let cancelled = false;
//     const seenNumbers = new Set();
//     let isStarted = false;

//     console.log(`Batch ID: ${batchId}`);

//     // Initialize processing
//     for (const number of numbers) {

//         if (isStarted) {
//             // Delay between messages
//             await delay(fixedDelay + parseInt(delayMs) * 1000);
//         }
//         isStarted = true;

//         // ⛔ CANCEL CHECK
//         if (isCancelled(userId)) {
//             console.log(`🛑 Cancelled processing for ${userId}`);

//             // Save unprocessed numbers as 'pending'
//             const remainingNumbers = numbers.slice(processed);
//             const remainingLogs = remainingNumbers.map(number => ({
//                 number: number,
//                 delay: delayMs,
//                 status: 'cancelled',
//                 error: 'Cancelled by user',
//                 duplicate: false,
//                 userId,
//                 batchId,
//                 timestamp: new Date()
//             }));

//             if (remainingLogs.length) {
//                 await MessageLog.insertMany(remainingLogs);
//             }

//             io.to(userId).emit('cancelled', { msg: 'Message sending cancelled.' });
//             clearAll(userId);
//             break;
//         }

//         // ⏸️ PAUSE CHECK
//         while (isPaused(userId)) {
//             await delay(500);
//             // Recheck cancel while paused
//             if (isCancelled(userId)) {
//                 console.log(`🛑 Cancelled (during pause) for ${userId}`);
//                 io.to(userId).emit('cancelled', { msg: 'Message sending cancelled.' });
//                 clearAll(userId);
//                 cancelled = true;
//                 break;
//             }
//         }

//         // If cancelled while paused, break outer loop
//         if (cancelled) break;

//         let formattedNumber = number.startsWith('+') ? number.slice(1) + '@c.us' : countryCode + number + '@c.us';

//         if (seenNumbers.has(formattedNumber)) {
//             await MessageLog.create({
//                 number,
//                 delay: delayMs,
//                 status: 'skipped',
//                 error: 'Duplicate number',
//                 duplicate: true,
//                 userId,
//                 batchId,
//             });
//             processed++;
//             duplicate++;
//             io.to(userId).emit('progress', {
//                 processed,
//                 success,
//                 failed,
//                 duplicate,
//                 total,
//                 currentNumber: number,
//                 fixedDelay,
//             });
//             continue; // Skip sending
//         }

//         console.log('Sending message to:', formattedNumber);

//         let isRegistered;
//         try {
//             isRegistered = await client.isRegisteredUser(formattedNumber);
//         } catch (err) {
//             console.error(`❌ Error checking registration for ${formattedNumber}:`, err);
//             isRegistered = false; // If there's an error, assume the number is not registered
//         }

//         if (!isRegistered) {
//             const error = "Number doesn't exist on WhatsApp";
//             console.warn(`⚠️ Skipping ${formattedNumber} - ${error}`);

//             // Log as failed
//             await MessageLog.create({
//                 number,
//                 delay: delayMs,
//                 status: 'failed',
//                 duplicate: false,
//                 error,
//                 userId: req.user?.id || null,
//                 batchId,
//             });
//             failed++;
//             processed++;

//             // Emit progress
//             io.to(userId).emit('progress', {
//                 processed,
//                 success,
//                 failed,
//                 duplicate,
//                 total,
//                 currentNumber: number,
//                 fixedDelay,
//             });

//             seenNumbers.add(formattedNumber);
//             continue; // 🚫 Skip to next number
//         }

//         let status = 'success';
//         let error = null;

//         try {
//             if (req.file) {
//                 const { buffer, mimetype, originalname } = req.file;
//                 const base64 = buffer.toString('base64');
//                 const media = new MessageMedia(mimetype, base64, originalname);

//                 console.log(`[DEBUG] Sending media. Type: ${mimetype}, Name: ${originalname}, Size: ${buffer.length}`);

//                 const msg = await client.sendMessage(formattedNumber, media, {
//                     caption: message || undefined
//                 });

//                 console.log('✅ File sent, WhatsApp returned:');
//             } else {
//                 const msg = await client.sendMessage(formattedNumber, message);
//                 console.log(`📤 Sent message to ${formattedNumber}`);
//             }

//             success++;
//         } catch (err) {
//             console.error(`❌ Failed to send to ${formattedNumber}:`, err);
//             status = 'failed';
//             error = err.message;
//             failed++;
//         }


//         seenNumbers.add(formattedNumber);


//         // Log the message status in the database
//         await MessageLog.create({
//             number,
//             delay: delayMs,
//             status,
//             duplicate: false,
//             ...(error && { error }),
//             userId: req.user?.id || null,
//             batchId,
//         });

//         processed++;

//         // Emit real-time progress
//         io.to(userId).emit('progress', {
//             processed,
//             success,
//             failed,
//             duplicate,
//             total,
//             currentNumber: number,
//             fixedDelay,
//         });

//         console.log(`Processed ${processed}`);

//     }

//     // Once all messages are processed
//     console.log(`Processing completed. Success: ${success}, Failed: ${failed}`);
// };




exports.sendMessage = async (req, res) => {
    const { message, delayMs = 0 } = req.body;
    const userId = req.user?.id;
    const rawNumbers = req.body.numbers;
    const numbers = Array.isArray(rawNumbers) ? rawNumbers : [rawNumbers];
    const countryCode = req.body.countryCode;

    const active = await isSessionActive(userId);
    if (!active) {
        console.log(`🛑 WhatsApp session is not active`);
        return res.status(440).json({
            status: false,
            msg: 'WhatsApp session expired. Please scan QR code again.'
        });
    }

    if (!numbers || !message) {
        return res.status(400).json({ status: false, msg: 'numbers and message are required' });
    }

    clearCancel(userId);

    const total = numbers.length;
    const io = req.app.get('io');
    const fixedDelay = 2000;
    const batchId = moment().format('YYYYMMDD_HHmmss');

    res.status(200).json({
        status: true,
        msg: 'Messages started processing',
        batchId: batchId
    });

    let processed = 0;
    let success = 0;
    let failed = 0;
    let duplicate = 0;
    let cancelled = false;
    const seenNumbers = new Set();
    let isStarted = false;

    const client = getClient(userId); // ✅ Move outside loop
    if (!client) {
        console.log("❌ Baileys client not found.");
        return;
    }

    console.log(`Batch ID: ${batchId}`);

    for (const number of numbers) {
        if (isStarted) {
            await delay(fixedDelay + parseInt(delayMs) * 1000);
        }
        isStarted = true;

        if (isCancelled(userId)) {
            console.log(`🛑 Cancelled processing for ${userId}`);
            const remainingNumbers = numbers.slice(processed);
            const remainingLogs = remainingNumbers.map(number => ({
                number,
                delay: delayMs,
                status: 'cancelled',
                error: 'Cancelled by user',
                duplicate: false,
                userId,
                batchId,
                timestamp: new Date()
            }));
            if (remainingLogs.length) {
                await MessageLog.insertMany(remainingLogs);
            }
            io.to(userId).emit('cancelled', { msg: 'Message sending cancelled.' });
            clearAll(userId);
            break;
        }

        while (isPaused(userId)) {
            await delay(500);
            if (isCancelled(userId)) {
                console.log(`🛑 Cancelled (during pause) for ${userId}`);
                io.to(userId).emit('cancelled', { msg: 'Message sending cancelled.' });
                clearAll(userId);
                cancelled = true;
                break;
            }
        }

        if (cancelled) break;

        let formattedNumber = number.startsWith('+') ? number.slice(1) + '@c.us' : countryCode + number;

        // ✅ Validate number: must be only digits
        if (!/^\d+$/.test(formattedNumber)) {
            console.log(`🚫 Invalid number format: ${formattedNumber}`);
            await MessageLog.create({
                number,
                delay: delayMs,
                status: 'failed',
                error: 'Invalid number format',
                duplicate: false,
                userId,
                batchId,
                timestamp: new Date()
            });
            processed++;
            failed++;
            io.to(userId).emit('progress', { processed, success, failed, duplicate, total, currentNumber: number, fixedDelay });
            continue; // Skip to next number
        }

        formattedNumber += '@c.us';

        if (seenNumbers.has(formattedNumber)) {
            await MessageLog.create({
                number,
                delay: delayMs,
                status: 'skipped',
                error: 'Duplicate number',
                duplicate: true,
                userId,
                batchId,
                timestamp: new Date()
            });
            processed++;
            duplicate++;
            io.to(userId).emit('progress', { processed, success, failed, duplicate, total, currentNumber: number, fixedDelay });
            continue;
        }

        console.log('🔄 Sending message to:', formattedNumber);

        let status = 'success';
        let error = null;

        try {
            // ✅ Check if number is registered
            const regInfo = await client.onWhatsApp(formattedNumber);
            if (!regInfo || regInfo.length === 0 || !regInfo[0].exists) {
                throw new Error("Number doesn't exist on WhatsApp");
            }

            if (req.file) {
                const { buffer, mimetype, originalname } = req.file;
                console.log(`[DEBUG] Sending media. Type: ${mimetype}, Name: ${originalname}, Size: ${buffer.length}`);

                const mediaPayload = {
                    mimetype,
                    fileName: originalname,
                    caption: message || ''
                };

                if (mimetype.startsWith('image/')) {
                    mediaPayload.image = buffer;
                } else if (mimetype.startsWith('video/')) {
                    mediaPayload.video = buffer;
                } else if (mimetype.startsWith('audio/')) {
                    mediaPayload.audio = buffer;
                } else {
                    mediaPayload.document = buffer;
                }

                await client.sendMessage(formattedNumber, mediaPayload);
            } else {
                const msgText = typeof message === 'string' ? message : message?.text;
                if (!msgText) throw new Error("Message content is invalid.");

                await client.sendMessage(formattedNumber, { text: msgText });
                console.log(`📤 Sent message to ${formattedNumber}`);
            }

            success++;
        } catch (err) {
            console.error(`❌ Failed to send to ${formattedNumber}:`, err);
            status = 'failed';
            error = err.message;
            failed++;
        }

        seenNumbers.add(formattedNumber);

        await MessageLog.create({
            number,
            delay: delayMs,
            status,
            duplicate: false,
            ...(error && { error }),
            userId,
            batchId,
            timestamp: new Date()
        });

        processed++;

        io.to(userId).emit('progress', { processed, success, failed, duplicate, total, currentNumber: number, fixedDelay });
        console.log(`Processed ${processed}`);
    }

    console.log(`✅ Processing completed. Success: ${success}, Failed: ${failed}`);
};





















exports.getMessageLogBatches = async (req, res) => {
    try {
        const logs = await MessageLog.find({ userId: req.user.id }).sort({ timestamp: -1 });

        const summaries = {};

        for (const log of logs) {
            if (!summaries[log.batchId]) {
                summaries[log.batchId] = {
                    batchId: log.batchId,
                    timestamp: log.timestamp,
                    total: 0,
                    success: 0,
                    failed: 0,
                    cancelled: 0,
                    duplicates: 0,
                    expiresIn: null
                };
            }

            summaries[log.batchId].total += 1;

            if (log.duplicate) {
                summaries[log.batchId].duplicates += 1;
            }
            if (log.status === 'success') {
                summaries[log.batchId].success += 1;
            } else if (log.status === 'cancelled') {
                summaries[log.batchId].cancelled += 1;
            } else if (log.status === 'failed') {
                summaries[log.batchId].failed += 1;
            }

            // TTL logic (6 hours)
            const ttlMs = 6 * 60 * 60 * 1000;
            const expiryTime = new Date(log.timestamp.getTime() + ttlMs);
            const expiresIn = expiryTime - new Date();

            summaries[log.batchId].expiresIn = Math.min(
                summaries[log.batchId].expiresIn ?? Infinity,
                expiresIn
            );
        }

        const formattedSummaries = Object.values(summaries)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .map(summary => ({
                ...summary,
                expiresIn: summary.expiresIn > 0
                    ? Math.ceil(summary.expiresIn / 1000 / 60) + ' min'
                    : 'Expired'
            }));

        res.status(200).json({
            status: true,
            batches: formattedSummaries
        });
    } catch (err) {
        console.error('❌ Error fetching logs:', err);
        res.status(500).json({ status: false, msg: 'Failed to fetch logs' });
    }
};



exports.downloadBatchLogs = async (req, res) => {
    const { batchId } = req.params;
    const userId = req.user.id;

    try {
        const logs = await MessageLog.find({ batchId, userId }).sort({ timestamp: 1 });

        if (!logs.length) {
            return res.status(404).json({ status: false, msg: 'No logs found for this batch.' });
        }

        const workbook = new ExcelJS.Workbook();

        // Common columns
        const columns = [
            { header: 'Phone Number', key: 'number', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Delay (ms)', key: 'delay', width: 15 },
            { header: 'Timestamp', key: 'timestamp', width: 25 },
            { header: 'Error', key: 'error', width: 40 }
        ];

        // Split logs into categories
        const successLogs = logs.filter(log => log.status === 'success' && !log.duplicate);
        const failedLogs = logs.filter(log => log.status === 'failed' && !log.duplicate);
        const duplicateLogs = logs.filter(log => log.duplicate);
        const pendingLogs = logs.filter(log => log.status === 'cancelled' || (!log.status && !log.duplicate));

        // Helper to create and populate sheet
        const createSheet = (name, data) => {
            const sheet = workbook.addWorksheet(name);
            sheet.columns = columns;

            data.forEach(log => {
                sheet.addRow({
                    number: log.number,
                    status: log.status || 'pending',
                    delay: log.delay || 0,
                    timestamp: log.timestamp ? new Date(log.timestamp).toLocaleString() : '',
                    error: log.error || ''
                });
            });
        };

        createSheet('Success', successLogs);
        createSheet('Failed', failedLogs);
        createSheet('Duplicates', duplicateLogs);
        createSheet('Pending', pendingLogs);

        res.setHeader(
            'Content-Disposition',
            `attachment; filename=Batch_${batchId}_Logs.xlsx`
        );
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error('❌ Error generating Excel:', err);
        res.status(500).json({ status: false, msg: 'Failed to generate Excel file' });
    }
};







