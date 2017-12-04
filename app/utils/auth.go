package utils

import (
	// "authApp/app/models"
	// "github.com/jinzhu/gorm"
	"github.com/revel/revel"
	"authApp/app/routes"
)

func CheckLogin(c *revel.Controller) revel.Result {

	username, _ := c.Session["username"]
	if username == "" {
		c.Flash.Error("Please log in first")
		return c.Redirect(routes.App.Login())
	}
	c.ViewArgs["username"], _ = c.Session["username"]
	c.ViewArgs["name"], _ = c.Session["name"]
	c.ViewArgs["domain"], _ = c.Session["domain"]
	c.ViewArgs["client"], _ = c.Session["client"]
	return nil
}