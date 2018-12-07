// Standard Node modules
const Path = require("path");

// Knex
const knex = require("knex")({
    client: "pg",
    connection: {
        host: "faraday.cse.taylor.edu",
        database: "gabe_helmuth",
		user: "gabe_helmuth",
		password: "falodepa"
    }
});

// Hapi
const Joi = require("joi"); // Input validation
const Hapi = require("hapi"); // Server

const server = Hapi.server({
    host: "localhost",
    port: 3000,
    routes: {
        files: {
            relativeTo: Path.join(__dirname, "dist")
        }
    }
});

Member = require('./tables/Member');
Vote = require('./tables/Vote');
Member_Team = require('./tables/Member_Team');
Core_Hours = require('./tables/Core_Hours');
Commitment = require('./tables/Commitment');
Proposed_Time = require('./tables/Proposed_Time');
Team = require('./tables/Team');
Activity = require('./tables/Activity');



async function init() {
    // Show routes at startup.
    await server.register(require("blipp"));

    // Output logging information.
    await server.register({
        plugin: require("hapi-pino"),
        options: {
            prettyPrint: true
        }
    });

    // Configure static file service.
    await server.register(require("inert"));

    // Configure routes.
    server.route([
        {
            method: "POST",
            path: "/api/accounts",
            config: {
                description: "Sign up for an account",
                validate: {
                    payload: {
                        firstName: Joi.string().required(),
                        lastName: Joi.string().required(),
                        email: Joi.string()
                            .email()
                            .required(),
                        password: Joi.string().required()
                    }
                }
            },
            handler: async (request, h) => {
                let resultSet = await knex("accounts")
                    .select()
                    .where("email", request.payload.email);
                if (resultSet.length > 0) {
                    return {
                        ok: false,
                        msge: `The account '${request.payload.email}' is already in use`
                    };
                }

                let result = await knex("accounts").insert({
                    firstname: request.payload.firstName,
                    lastname: request.payload.lastName,
                    email: request.payload.email,
                    password: request.payload.password
                });

                if (result.rowCount === 1) {
                    return {
                        ok: true,
                        msge: `Created account '${request.payload.email}'`
                    };
                } else {
                    return {
                        ok: false,
                        msge: `Couldn't add '${
                            request.payload.email
                        }' to the database`
                    };
                }
            }
        },
        {
            method: "GET",
            path: "/api/accounts",
            config: {
                description: "Retrieve all accounts"
            },
            handler: async (request, h) => {
                return knex("accounts").select("email", "firstname", "lastname");
            }
        },
		
		// New route
		
		{
            method: "POST",
            path: "/api/reset-password",
            config: {
                description: "Reset an account password",
                validate: {
                    payload: {
						email: Joi.string()
                            .email()
                            .required(),
						password: Joi.string().required(),
                        newPassword1: Joi.string().required()
                    }
                }
            },
            handler: async (request, h) => {
			 // Checks to see if email exists in database
                let emailCheck = await knex("accounts")
                    .select()
                    .where("email", request.payload.email);
                if (emailCheck.length == 0) {
                    return {
                        ok: false,
                        msge: `The input account '${request.payload.email}' does not exist.`
                    };
                }
				let passwordCheck = await knex("accounts")
                    .select()
                    .where("password", request.payload.password);
                if (passwordCheck.length == 0) {
                    return {
                        ok: false,
                        msge: `The input current password '${request.payload.password}' does not match the account '${request.payload.email}.'`
                    };
                }
				console.log("Hey");
				
                let pwChange = await knex("accounts")
					.update({
						password: request.payload.newPassword1
					})
					.where("email", request.payload.email);
				
				return {
					ok: true,
					msge: `Updated password for '${request.payload.email}.'`
				}
				
				// FIXME: This code was meant to check whether the new password was put in.
				/*
				let result = await knex("accounts")
                    .select()
                    .where("email", request.payload.email);
                if (result.password == request.payload.newPassword1) {
                    return {
                        ok: true,
                        msge: `Updated password for '${request.payload.email}.'`
                    };
                } else {
					return {
                        ok: false,
                        msge: `Failed to update password for the account '${request.payload.email}.'`
                    };
				}
				*/
            }
        },

        {
            method: "GET",
            path: "/{param*}",
            config: {
                description: "Production Application"
            },
            handler: {
                directory: {
                    path: ".",
                    redirectToSlash: true,
                    index: true
                }
            }
        }
    ]);

    // Start the server.
    await server.start();
    server.logger().info(`Server running at ${server.info.uri}`);
}

process.on("unhandledRejection", err => {
    server.logger().error(err);
    process.exit(1);
});

// Go!
init();
