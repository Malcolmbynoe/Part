const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const db = require("./database");

const {
    createToken,
    authenticateToken,
    requireAdmin
} = require("./auth");

const app = express();

const PORT = 3000;

app.use(cors());
app.use(express.json());


// ========================================
// TEST ROUTE
// ========================================

app.get("/", (req, res) => {

    res.json({
        message: "Nova Auto Parts & Service API is running."
    });

});


// ========================================
// LOGIN
// ========================================

app.post("/api/login", (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {

        return res.status(400).json({
            error: "Email and password are required."
        });

    }

    const user = db
        .prepare(
            "SELECT * FROM users WHERE email = ?"
        )
        .get(email);

    if (!user) {

        return res.status(401).json({
            error: "Invalid email or password."
        });

    }

    const passwordCorrect =
        bcrypt.compareSync(
            password,
            user.password
        );

    if (!passwordCorrect) {

        return res.status(401).json({
            error: "Invalid email or password."
        });

    }

    const token = createToken(user);

    res.json({
        message: "Login successful.",

        token,

        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    });

});

// ========================================
// LOGIN
// ========================================

app.post("/api/login", async (req, res) => {

    // ... your existing login code ...

});


// ========================================
// CUSTOMER REGISTRATION
// ========================================

app.post("/api/register", async (req, res) => {

    const {
        name,
        email,
        password
    } = req.body;

    if (!name || !email || !password) {

        return res.status(400).json({
            error: "Name, email and password are required."
        });

    }

    if (password.length < 6) {

        return res.status(400).json({
            error: "Password must be at least 6 characters."
        });

    }

    const existingUser = db
        .prepare(`
            SELECT id
            FROM users
            WHERE email = ?
        `)
        .get(email);

    if (existingUser) {

        return res.status(409).json({
            error: "An account with this email already exists."
        });

    }

    const hashedPassword =
        await bcrypt.hash(password, 12);

    const result = db
        .prepare(`
            INSERT INTO users
            (
                name,
                email,
                password,
                role
            )
            VALUES (?, ?, ?, ?)
        `)
        .run(
            name,
            email,
            hashedPassword,
            "customer"
        );

    const user = {
        id: result.lastInsertRowid,
        name,
        email,
        role: "customer"
    };

    const token = createToken(user);

    res.status(201).json({
        message: "Account created successfully.",
        token,
        user
    });

});

// ========================================
// CURRENT USER
// ========================================

app.get(
    "/api/me",
    authenticateToken,
    (req, res) => {

        const user = db
            .prepare(`
                SELECT
                    id,
                    name,
                    email,
                    role,
                    created_at
                FROM users
                WHERE id = ?
            `)
            .get(req.user.id);

        res.json(user);

    }
);


// ========================================
// GET VEHICLES
// ========================================

app.get("/api/vehicles", (req, res) => {

    const vehicles = db
        .prepare(`
            SELECT *
            FROM vehicles
            ORDER BY created_at DESC
        `)
        .all();

    res.json(vehicles);

});



// ========================================
// ADMIN DASHBOARD STATS
// ========================================

app.get(
    "/api/admin/stats",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const vehicles =
            db.prepare(
                "SELECT COUNT(*) AS count FROM vehicles"
            ).get().count;

        const available =
            db.prepare(`
                SELECT COUNT(*) AS count
                FROM vehicles
                WHERE status = 'available'
            `).get().count;

        const sold =
            db.prepare(`
                SELECT COUNT(*) AS count
                FROM vehicles
                WHERE status = 'sold'
            `).get().count;

        const parts =
            db.prepare(
                "SELECT COUNT(*) AS count FROM parts"
            ).get().count;

        const customers =
            db.prepare(`
                SELECT COUNT(*) AS count
                FROM users
                WHERE role = 'customer'
            `).get().count;

        const orders =
            db.prepare(
                "SELECT COUNT(*) AS count FROM orders"
            ).get().count;

        res.json({
            vehicles,
            available,
            sold,
            parts,
            customers,
            orders
        });

    }
);


// ========================================
// ADMIN - GET ALL VEHICLES
// ========================================

app.get(
    "/api/admin/vehicles",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const vehicles = db
            .prepare(`
                SELECT *
                FROM vehicles
                ORDER BY created_at DESC
            `)
            .all();

        res.json(vehicles);

    }
);


// ========================================
// ADMIN - ADD VEHICLE
// ========================================

app.post(
    "/api/admin/vehicles",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const {
            name,
            year,
            price,
            category,
            description,
            image,
            status,
            daily_rate,
            weekly_rate,
            monthly_rate
        } = req.body;


        if (!name || price === undefined || !category) {

            return res.status(400).json({
                error:
                    "Name, price and category are required."
            });

        }


        const result = db
            .prepare(`
                INSERT INTO vehicles
                (
                    name,
                    year,
                    price,
                    category,
                    description,
                    image,
                    status,
                    daily_rate,
                    weekly_rate,
                    monthly_rate
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .run(
                name,
                year || null,
                price,
                category,
                description || "",
                image || "",
                status || "available",
                daily_rate ?? null,
                weekly_rate ?? null,
                monthly_rate ?? null
            );


        res.json({
            message:
                "Vehicle added successfully.",

            id:
                result.lastInsertRowid
        });

    }
);


// ========================================
// ADMIN - EDIT VEHICLE
// ========================================

app.put(
    "/api/admin/vehicles/:id",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const {
            name,
            year,
            price,
            category,
            description,
            image,
            status,
            daily_rate,
            weekly_rate,
            monthly_rate
        } = req.body;


        if (!name || price === undefined || !category) {

            return res.status(400).json({
                error:
                    "Name, price and category are required."
            });

        }


        db.prepare(`
            UPDATE vehicles
            SET
                name = ?,
                year = ?,
                price = ?,
                category = ?,
                description = ?,
                image = ?,
                status = ?,
                daily_rate = ?,
                weekly_rate = ?,
                monthly_rate = ?
            WHERE id = ?
        `).run(
            name,
            year || null,
            price,
            category,
            description || "",
            image || "",
            status || "available",
            daily_rate ?? null,
            weekly_rate ?? null,
            monthly_rate ?? null,
            req.params.id
        );


        res.json({
            message:
                "Vehicle updated successfully."
        });

    }
);


// ========================================
// ADMIN - DELETE VEHICLE
// ========================================

app.delete(
    "/api/admin/vehicles/:id",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        db.prepare(`
            DELETE FROM vehicles
            WHERE id = ?
        `).run(req.params.id);

        res.json({
            message: "Vehicle removed successfully."
        });

    }
);


// ========================================
// ADMIN - CHANGE VEHICLE STATUS
// ========================================

app.patch(
    "/api/admin/vehicles/:id/status",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const { status } = req.body;

        const allowedStatuses = [
            "available",
            "sold",
            "reserved"
        ];

        if (!allowedStatuses.includes(status)) {

            return res.status(400).json({
                error: "Invalid vehicle status."
            });

        }

        db.prepare(`
            UPDATE vehicles
            SET status = ?
            WHERE id = ?
        `).run(
            status,
            req.params.id
        );

        res.json({
            message:
                `Vehicle marked ${status}.`
        });

    }
);


// ========================================
// ADMIN - GET ORDERS
// ========================================

app.get(
    "/api/admin/orders",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const orders = db
            .prepare(`
                SELECT *
                FROM orders
                ORDER BY created_at DESC
            `)
            .all();

        res.json(orders);

    }
);

/* =========================================
   ADMIN - GET ALL RENTALS
========================================= */

app.get(
    "/api/admin/rentals",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        try {

            const rentals = db
                .prepare(`
                    SELECT
                        rentals.id,
                        rentals.user_id,
                        rentals.vehicle_id,

                        rentals.customer_name,
                        rentals.customer_email,

                        vehicles.name AS vehicle_name,
                        vehicles.year AS vehicle_year,

                        rentals.pickup_date,
                        rentals.return_date,
                        rentals.rate_type,

                        rentals.daily_rate,
                        rentals.weekly_rate,
                        rentals.monthly_rate,

                        rentals.total_price,
                        rentals.status,
                        rentals.created_at

                    FROM rentals

                    JOIN vehicles
                        ON vehicles.id =
                           rentals.vehicle_id

                    ORDER BY
                        rentals.created_at DESC
                `)
                .all();


            res.json(rentals);


        } catch (error) {

            console.error(
                "Admin rentals error:",
                error
            );

            res.status(500).json({
                error:
                    "Unable to load rentals."
            });

        }

    }
);


/* =========================================
   ADMIN - UPDATE RENTAL STATUS
========================================= */

app.patch(
    "/api/admin/rentals/:id/status",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        try {

            const {
                status
            } = req.body;


            const allowedStatuses = [
                "pending",
                "approved",
                "active",
                "completed",
                "cancelled"
            ];


            if (
                !allowedStatuses.includes(
                    status
                )
            ) {

                return res.status(400).json({
                    error:
                        "Invalid rental status."
                });

            }


            const rental = db
                .prepare(`
                    SELECT *
                    FROM rentals
                    WHERE id = ?
                `)
                .get(req.params.id);


            if (!rental) {

                return res.status(404).json({
                    error:
                        "Rental request not found."
                });

            }


            /*
                If approving or activating,
                make sure another approved/active
                rental does not overlap.
            */

            if (
                status === "approved" ||
                status === "active"
            ) {

                const conflict = db
                    .prepare(`
                        SELECT id
                        FROM rentals

                        WHERE vehicle_id = ?

                        AND id != ?

                        AND status IN (
                            'approved',
                            'active'
                        )

                        AND pickup_date < ?
                        AND return_date > ?

                        LIMIT 1
                    `)
                    .get(
                        rental.vehicle_id,
                        rental.id,
                        rental.return_date,
                        rental.pickup_date
                    );


                if (conflict) {

                    return res.status(409).json({
                        error:
                            "This vehicle already has an approved or active rental for those dates."
                    });

                }

            }


            db.prepare(`
                UPDATE rentals
                SET status = ?
                WHERE id = ?
            `)
            .run(
                status,
                req.params.id
            );


            res.json({
                message:
                    "Rental status updated successfully."
            });


        } catch (error) {

            console.error(
                "Rental status error:",
                error
            );


            res.status(500).json({
                error:
                    "Unable to update rental status."
            });

        }

    }
);

// ========================================
// PUBLIC - VEHICLES
// ========================================

app.get("/api/vehicles", (req, res) => {

    const vehicles = db
        .prepare(`
            SELECT
                id,
                name,
                year,
                price,
                category,
                description,
                image,
                status
            FROM vehicles
            ORDER BY created_at DESC
        `)
        .all();

    res.json(vehicles);

});

// ========================================
// PUBLIC - PARTS
// ========================================

app.get("/api/parts", (req, res) => {

    try {

        const parts = db
            .prepare(`
                SELECT
                    id,
                    name,
                    price,
                    description,
                    image,
                    status
                FROM parts
                ORDER BY created_at DESC
            `)
            .all();

        res.json(parts);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Unable to load parts."
        });

    }

});

// ========================================
// ADMIN - PARTS
// ========================================

app.get(
    "/api/admin/parts",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const parts = db
            .prepare(`
                SELECT *
                FROM parts
                ORDER BY created_at DESC
            `)
            .all();

        res.json(parts);

    }
);


app.post(
    "/api/admin/parts",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const {
            name,
            price,
            description,
            image,
            status
        } = req.body;

        if (!name || price === undefined) {

            return res.status(400).json({
                error:
                    "Part name and price are required."
            });

        }

        const allowedStatuses = [
            "available",
            "reserved",
            "sold"
        ];

        const finalStatus =
            allowedStatuses.includes(status)
                ? status
                : "available";

        const result = db
            .prepare(`
                INSERT INTO parts
                (
                    name,
                    price,
                    description,
                    image,
                    status
                )
                VALUES (?, ?, ?, ?, ?)
            `)
            .run(
                name,
                price,
                description || "",
                image || "",
                finalStatus
            );

        res.json({
            message:
                "Part added successfully.",
            id:
                result.lastInsertRowid
        });

    }
);


app.put(
    "/api/admin/parts/:id",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const {
            name,
            price,
            description,
            image,
            status
        } = req.body;

        const allowedStatuses = [
            "available",
            "reserved",
            "sold"
        ];

        if (!allowedStatuses.includes(status)) {

            return res.status(400).json({
                error:
                    "Invalid part status."
            });

        }

        db.prepare(`
            UPDATE parts
            SET
                name = ?,
                price = ?,
                description = ?,
                image = ?,
                status = ?
            WHERE id = ?
        `).run(
            name,
            price,
            description || "",
            image || "",
            status,
            req.params.id
        );

        res.json({
            message:
                "Part updated successfully."
        });

    }
);


app.delete(
    "/api/admin/parts/:id",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        db.prepare(`
            DELETE FROM parts
            WHERE id = ?
        `).run(req.params.id);

        res.json({
            message:
                "Part removed successfully."
        });

    }
);


app.patch(
    "/api/admin/parts/:id/status",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const { status } = req.body;

        const allowedStatuses = [
            "available",
            "reserved",
            "sold"
        ];

        if (!allowedStatuses.includes(status)) {

            return res.status(400).json({
                error:
                    "Invalid part status."
            });

        }

        db.prepare(`
            UPDATE parts
            SET status = ?
            WHERE id = ?
        `).run(
            status,
            req.params.id
        );

        res.json({
            message:
                `Part marked ${status}.`
        });

    }
);


// ========================================
// ADMIN - CUSTOMERS
// ========================================

app.get(
    "/api/admin/customers",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const customers = db
            .prepare(`
                SELECT
                    id,
                    name,
                    email,
                    role,
                    created_at
                FROM users
                WHERE role = 'customer'
                ORDER BY created_at DESC
            `)
            .all();

        res.json(customers);

    }
);

// ========================================
// CUSTOMER - CREATE ORDER
// ========================================

app.post(
    "/api/orders",
    authenticateToken,
    (req, res) => {

        const {
            item_type,
            item_description,
            quantity
        } = req.body;

        if (!item_type || !item_description) {

            return res.status(400).json({
                error:
                    "Item type and description are required."
            });

        }


        const user = db
            .prepare(`
                SELECT
                    id,
                    name,
                    email
                FROM users
                WHERE id = ?
            `)
            .get(req.user.id);


        if (!user) {

            return res.status(404).json({
                error:
                    "Customer account not found."
            });

        }


        const finalQuantity =
            Number(quantity) > 0
                ? Number(quantity)
                : 1;


        const result = db
            .prepare(`
                INSERT INTO orders
                (
                    user_id,
                    customer_name,
                    customer_email,
                    item_type,
                    item_description,
                    quantity,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `)
            .run(
                user.id,
                user.name,
                user.email,
                item_type,
                item_description,
                finalQuantity,
                "pending"
            );


        res.status(201).json({

            message:
                "Order submitted successfully.",

            orderId:
                result.lastInsertRowid

        });

    }
);

// ========================================
// CUSTOMER - MY ORDERS
// ========================================

app.get(
    "/api/my-orders",
    authenticateToken,
    (req, res) => {

        try {

            const orders = db
                .prepare(`
                    SELECT
                        id,
                        item_type,
                        item_description,
                        quantity,
                        status,
                        created_at
                    FROM orders
                    WHERE user_id = ?
                    ORDER BY created_at DESC
                `)
                .all(req.user.id);


            res.json(orders);


        } catch (error) {

            console.error(error);

            res.status(500).json({
                error:
                    "Unable to load your orders."
            });

        }

    }
);

/* =========================================
   CUSTOMER - MY RENTALS
========================================= */

app.get(
    "/api/my-rentals",
    authenticateToken,
    (req, res) => {

        try {

            const rentals = db
                .prepare(`
                    SELECT
                        rentals.id,
                        rentals.vehicle_id,
                        vehicles.name AS vehicle_name,
                        vehicles.year AS vehicle_year,
                        vehicles.image AS vehicle_image,

                        rentals.pickup_date,
                        rentals.return_date,
                        rentals.rate_type,

                        rentals.daily_rate,
                        rentals.weekly_rate,
                        rentals.monthly_rate,

                        rentals.total_price,
                        rentals.status,
                        rentals.created_at

                    FROM rentals

                    JOIN vehicles
                        ON vehicles.id =
                           rentals.vehicle_id

                    WHERE rentals.user_id = ?

                    ORDER BY
                        rentals.created_at DESC
                `)
                .all(req.user.id);


            res.json(rentals);


        } catch (error) {

            console.error(
                "My rentals error:",
                error
            );


            res.status(500).json({
                error:
                    "Unable to load your rentals."
            });

        }

    }
);

/* =========================================
   CUSTOMER - CREATE RENTAL REQUEST
========================================= */

app.post(
    "/api/rentals",
    authenticateToken,
    (req, res) => {

        const {
            vehicle_id,
            pickup_date,
            return_date,
            rate_type
        } = req.body;


        /* -----------------------------
           BASIC VALIDATION
        ----------------------------- */

        if (
            !vehicle_id ||
            !pickup_date ||
            !return_date ||
            !rate_type
        ) {

            return res.status(400).json({
                error:
                    "Vehicle, pickup date, return date and rental rate are required."
            });

        }


        const allowedRateTypes = [
            "daily",
            "weekly",
            "monthly"
        ];


        if (
            !allowedRateTypes.includes(
                rate_type
            )
        ) {

            return res.status(400).json({
                error:
                    "Invalid rental rate type."
            });

        }


        /* -----------------------------
           GET CUSTOMER
        ----------------------------- */

        const user = db
            .prepare(`
                SELECT
                    id,
                    name,
                    email
                FROM users
                WHERE id = ?
            `)
            .get(req.user.id);


        if (!user) {

            return res.status(404).json({
                error:
                    "Customer account not found."
            });

        }


        /* -----------------------------
           GET VEHICLE
        ----------------------------- */

        const vehicle = db
            .prepare(`
                SELECT *
                FROM vehicles
                WHERE id = ?
            `)
            .get(vehicle_id);


        if (!vehicle) {

            return res.status(404).json({
                error:
                    "Rental vehicle not found."
            });

        }


        if (vehicle.status === "sold") {

            return res.status(400).json({
                error:
                    "This vehicle is not available for rental."
            });

        }


        /*
            Make sure this is actually
            a rental vehicle.
        */

        const category =
            String(
                vehicle.category || ""
            ).toLowerCase();


        const isRentalVehicle =
            category.includes("rental") ||
            category.includes("rent") ||
            category.includes("hire");


        if (!isRentalVehicle) {

            return res.status(400).json({
                error:
                    "This vehicle is not listed as a rental vehicle."
            });

        }


        /* -----------------------------
           VALIDATE DATES
        ----------------------------- */

        const pickup =
            new Date(
                `${pickup_date}T00:00:00Z`
            );

        const returning =
            new Date(
                `${return_date}T00:00:00Z`
            );


        if (
            Number.isNaN(
                pickup.getTime()
            ) ||
            Number.isNaN(
                returning.getTime()
            )
        ) {

            return res.status(400).json({
                error:
                    "Invalid rental dates."
            });

        }


        const millisecondsPerDay =
            1000 * 60 * 60 * 24;


        const days =
            Math.ceil(
                (
                    returning.getTime() -
                    pickup.getTime()
                ) /
                millisecondsPerDay
            );


        if (days <= 0) {

            return res.status(400).json({
                error:
                    "Return date must be after pickup date."
            });

        }


        /* -----------------------------
           CALCULATE PRICE
           SERVER SIDE
        ----------------------------- */

        let rate = 0;
        let units = 0;


        if (rate_type === "daily") {

            rate =
                Number(
                    vehicle.daily_rate
                );

            units = days;

        }


        if (rate_type === "weekly") {

            rate =
                Number(
                    vehicle.weekly_rate
                );

            units =
                Math.ceil(
                    days / 7
                );

        }


        if (rate_type === "monthly") {

            rate =
                Number(
                    vehicle.monthly_rate
                );

            units =
                Math.ceil(
                    days / 30
                );

        }


        if (
            !Number.isFinite(rate) ||
            rate <= 0
        ) {

            return res.status(400).json({
                error:
                    "The selected rental rate is not available."
            });

        }


        const totalPrice =
            rate * units;


        /* -----------------------------
           CHECK DATE AVAILABILITY
        ----------------------------- */

        const conflict = db
            .prepare(`
                SELECT id
                FROM rentals
                WHERE vehicle_id = ?

                AND status IN (
                    'pending',
                    'approved',
                    'active'
                )

                AND pickup_date < ?
                AND return_date > ?

                LIMIT 1
            `)
            .get(
                vehicle.id,
                return_date,
                pickup_date
            );


        if (conflict) {

            return res.status(409).json({
                error:
                    "This vehicle already has a rental request for those dates."
            });

        }


        /* -----------------------------
           SAVE RENTAL
        ----------------------------- */

        const result = db
            .prepare(`
                INSERT INTO rentals
                (
                    user_id,
                    vehicle_id,

                    customer_name,
                    customer_email,

                    pickup_date,
                    return_date,

                    rate_type,

                    daily_rate,
                    weekly_rate,
                    monthly_rate,

                    total_price,
                    status
                )

                VALUES (
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?
                )
            `)
            .run(
                user.id,
                vehicle.id,

                user.name,
                user.email,

                pickup_date,
                return_date,

                rate_type,

                vehicle.daily_rate,
                vehicle.weekly_rate,
                vehicle.monthly_rate,

                totalPrice,
                "pending"
            );


        res.status(201).json({

            message:
                "Rental request submitted successfully.",

            rentalId:
                result.lastInsertRowid,

            totalPrice:
                totalPrice

        });

    }
);

// ========================================
// ADMIN - UPDATE ORDER STATUS
// ========================================

app.patch(
    "/api/admin/orders/:id/status",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const {
            status
        } = req.body;

        const allowedStatuses = [
            "pending",
            "processing",
            "completed",
            "cancelled"
        ];

        if (!allowedStatuses.includes(status)) {

            return res.status(400).json({
                error:
                    "Invalid order status."
            });

        }

        db.prepare(`
            UPDATE orders
            SET status = ?
            WHERE id = ?
        `).run(
            status,
            req.params.id
        );

        res.json({
            message:
                "Order status updated."
        });

    }
);

// ========================================
// ADMIN - UPDATE ORDER STATUS
// ========================================

app.patch(
    "/api/admin/orders/:id/status",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const {
            status
        } = req.body;

        const allowedStatuses = [
            "pending",
            "processing",
            "completed",
            "cancelled"
        ];

        if (!allowedStatuses.includes(status)) {

            return res.status(400).json({
                error:
                    "Invalid order status."
            });

        }

        db.prepare(`
            UPDATE orders
            SET status = ?
            WHERE id = ?
        `).run(
            status,
            req.params.id
        );

        res.json({
            message:
                "Order status updated."
        });

    }
);

// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {

    console.log("");
    console.log("====================================");
    console.log(" NOVA AUTO PARTS & SERVICE");
    console.log(" Backend server is running");
    console.log("====================================");
    console.log(
        ` http://localhost:${PORT}`
    );
    console.log("====================================");
    console.log("");

});