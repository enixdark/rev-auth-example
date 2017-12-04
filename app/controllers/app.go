package controllers

import (
	"github.com/revel/revel"
	"authApp/app/routes"
	"authApp/app/models"
	// "fmt"
)

type App struct {
	// GormController
	*revel.Controller
}

func (c App) Index() revel.Result {
	return c.Render()
}

func (c App) Login() revel.Result {
	return c.Render()
}

func (c App) PostLogin(email string, password string) revel.Result {
	
	user_schema := &models.User{Email: email, Password: password}
	user_schema.Validate(c.Validation)

	if c.Validation.HasErrors() {
		c.Validation.Keep()
		c.Flash.Error("Form invalid. Try again.")
		return c.Redirect(routes.App.Login())
	}

	user := &models.User{}

	// Db.First(&user)	

	if err := db.Where("email = ? ", email).First(&user).Error; err != nil {
		c.Flash.Error("User not exists")
		return c.Redirect(routes.App.Login())
	}

	// if user_schema.CheckPassword(user, password) != nil {
	// 	c.Flash.Error("Password invalid")
	// 	return c.Redirect(routes.App.Login())
	// }

	c.Session["user"] = user.Email
	c.Flash.Success("Login Success!")
	
	return c.Redirect(routes.App.Index())
}

func (c App) Logout() revel.Result {

	delete(c.Session, "user")
	return c.Redirect(routes.App.Login())

}

func Before(c *revel.Controller) revel.Result {
    _, ok := c.Session["user"]

    if !ok && !redirectForbidden[c.Action] {
        return c.Redirect(App.Login)
	}
	
	c.ViewArgs["user"], _ = c.Session["user"]

    return nil
}



var redirectForbidden = map[string]bool {
    "App.Login":     true,
	"App.PostLogin": true,
	"Static.Serve":  true,
}

func init() {
    revel.InterceptMethod(Before, revel.BEFORE)
}