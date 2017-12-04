package controllers

import (
	"database/sql"
	"authApp/app/models"
	"github.com/jinzhu/gorm"
	// "github.com/lib/pq"
	"github.com/revel/revel"
	_ "github.com/jinzhu/gorm/dialects/postgres"

)

type GormController struct {
	*revel.Controller
	Tx *gorm.DB
}


var db *gorm.DB


func InitDB() {
	var err error

	db, err = gorm.Open("postgres", "host=127.0.0.1 port=5432 user=admin dbname=authexample sslmode=disable password=admin")

	if err != nil {
		revel.ERROR.Println("FATAL", err)
		panic(err)
	}
	var user models.User
	revel.ERROR.Println("FATAL", db.Where(&models.User{Email: "jinzhu"}).First(&user))

	db.LogMode(true)
    // db.DB().Ping()
    // db.DB().SetMaxIdleConns(20)
    // db.DB().SetMaxOpenConns(100)
    // db.SingularTable(true)
 
    if !db.HasTable(&models.User{}) {
		db.CreateTable(&models.User{})
		db.AutoMigrate(&models.User{})
		db.Model(&models.User{}).AddUniqueIndex("idx_user__id", "id")
		db.Model(&models.User{}).AddUniqueIndex("idx_user__mail", "email")
	}	
	
	u := models.User{Email: "admin@gmail.com", Password: "12345678"}
	u.SetNewPassword(u.Password)
	db.NewRecord(u)
	db.Create(&u)
	
}

func (c *GormController) Begin() revel.Result {
	tx := db.Begin()

	if tx.Error != nil {
		panic(tx.Error)
	}

	c.Tx = tx

	revel.INFO.Println("c.Tx init", c.Tx)
	return nil
}

func (c *GormController) Commit() revel.Result {
	if c.Tx == nil {
		return nil
	}

	c.Tx.Commit()

	if err := c.Tx.Error; err != nil && err != sql.ErrTxDone {
		panic(err)
	}

	c.Tx = nil
	return nil
}

func (c *GormController) Rollback() revel.Result {

    if c.Tx == nil {
        return nil
    }
    c.Tx.Rollback()
    if err := c.Tx.Error; err != nil && err != sql.ErrTxDone {
        panic(err)
    }
    c.Tx = nil
    return nil
}