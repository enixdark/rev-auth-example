package models

import (
	"fmt"
	"time"
	"golang.org/x/crypto/bcrypt"
	"github.com/revel/revel"
	"regexp"
	// "github.com/jinzhu/gorm"
)

type User struct {
	Id int64
	FirstName string `sql:"size:255" json:"name"`
	LastName string `sql:"size:255" json:"name"`
	Email string  `sql:"not null;unique" json:"email"`
	Password string `sql:"-" json:"password,omitempty"`
	HashedPassword []byte
	Active bool	
	CreatedAt *time.Time
	UpdatedAt *time.Time
	DeletedAt *time.Time
	LastLoginAt *time.Time
}

var (
	uRegex = regexp.MustCompile("^\\w*$")
	// mRegex = regexp.MustCompile("^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,4}$")
)

func (u *User) String() string {
	return fmt.Sprintf("u(%s)", u.FirstName + u.LastName)
}

func (u *User) SetNewPassword(passwordString string) {
	bcryptPassword, _ := bcrypt.GenerateFromPassword([]byte(passwordString), bcrypt.DefaultCost)
	u.HashedPassword = bcryptPassword
	return 
}

func (u *User) CheckPassword(user User, password string) error {
	err := bcrypt.CompareHashAndPassword(user.HashedPassword, []byte(password))
	if err != nil { 
		return err		
	}
	return nil
}

func (u *User) Validate(v *revel.Validation) {

	// ValidateName(v, u.FirstName).Key("u.FirstName")
	// ValidateName(v, u.LastName).Key("u.LastName")

	ValidateEmail(v, u.Email).Key("u.Email")
	
	ValidatePassword(v, u.Password).
		Key("u.Password")
}

func ValidateEmail(v *revel.Validation, email string) *revel.ValidationResult {
	return v.Check(email,
		revel.Required{},
		// revel.Match{mRegex},
	)
} 

// func ValidateName(v *revel.Validation, name string) *revel.ValidationResult {
// 	return v.Check(name,
// 		revel.Required{},
// 		revel.MaxSize{15},
// 		revel.MinSize{3},
// 		revel.Match{uRegex},
// 	)
// }

func ValidatePassword(v *revel.Validation, password string) *revel.ValidationResult {
	return v.Check(password,
		revel.Required{},
		revel.MaxSize{15},
		revel.MinSize{5},
	)
}