package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/bradfitz/gomemcache/memcache"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

// LocationResponse ...
type LocationResponse struct {
	Timestamp   int64  `json:"timestamp"`
	Source      string `json:"source"`
	Suggestions []struct {
		ID               string  `json:"id"`
		FormattedAddress string  `json:"formattedAddress"`
		Latitude         float64 `json:"latitude"`
		Longitude        float64 `json:"longitude"`
	} `json:"suggestions"`
}

// AddressTechnology ...
type AddressTechnology struct {
	Timestamp   int64 `json:"timestamp"`
	ServingArea struct {
		CsaID           string      `json:"csaId"`
		TechType        string      `json:"techType"`
		ServiceType     string      `json:"serviceType"`
		ServiceStatus   string      `json:"serviceStatus"`
		ServiceCategory interface{} `json:"serviceCategory"`
		RfsMessage      interface{} `json:"rfsMessage"`
		Description     string      `json:"description"`
	} `json:"servingArea"`
	AddressDetail struct {
		ID               string  `json:"id"`
		Latitude         float64 `json:"latitude"`
		Longitude        float64 `json:"longitude"`
		ReasonCode       string  `json:"reasonCode"`
		ServiceType      string  `json:"serviceType"`
		ServiceStatus    string  `json:"serviceStatus"`
		TechType         string  `json:"techType"`
		FormattedAddress string  `json:"formattedAddress"`
		Frustrated       bool    `json:"frustrated"`
	} `json:"addressDetail"`
}

var cache *memcache.Client
var nbnAPIURI = "https://places.nbnco.net.au/places"

func main() {
	// memcache config
	servers := os.Getenv("MEMCACHE_SERVERS")
	cache = memcache.New(servers)
	err := cache.Ping()
	if err != nil {
		log.Error(err)
	}

	engine := gin.Default()
	engine.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"https://www.domain.com.au"},
		AllowMethods:     []string{"GET"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
		MaxAge:           3 * 24 * time.Hour,
	}))

	engine.GET("/location/id", getLocationIDWithAddress)
	engine.GET("/technology/:locationid", getTechnologyTypeWithLocationID)

	engine.Run()
}

func getLocationIDWithAddress(ctx *gin.Context) {
	// check the cache before continuing with sending requests to NBN's API
	key := strings.ReplaceAll(ctx.Query("address"), " ", "-")
	item, err := cache.Get(key)
	if err == nil {
		// got a hit from the cache, serve that for the request instead
		ctx.JSON(http.StatusAccepted, gin.H{
			"location":   string(item.Value),
			"from_cache": true,
		})
		return
	}

	// cache miss...
	// set the uri up to query NBN's API
	uri := fmt.Sprintf("%s/v1/autocomplete?query=", nbnAPIURI)
	uri += strings.ReplaceAll(ctx.Query("address"), " ", "%20")
	req, _ := http.NewRequest(http.MethodGet, uri, nil)

	req.Header.Add("Referer", "https://www.nbnco.com.au/")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		ctx.AbortWithStatus(http.StatusBadRequest)
		log.Error("fetching location details", err)
		return
	}

	locations := &LocationResponse{}
	err = json.NewDecoder(resp.Body).Decode(locations)
	if err != nil {
		ctx.AbortWithStatus(http.StatusBadRequest)
		log.Error("decoding location details", err)
		return
	}

	if len(locations.Suggestions) == 0 {
		ctx.AbortWithStatus(http.StatusBadRequest)
		return
	}

	id := locations.Suggestions[0].ID
	err = cache.Set(&memcache.Item{Key: key, Value: []byte(id)})
	if err != nil {
		log.Error(err)
	}

	ctx.JSON(http.StatusAccepted, gin.H{
		"location":   id,
		"from_cache": false,
	})
}

func getTechnologyTypeWithLocationID(ctx *gin.Context) {
	// check the cache before continuing with sending requests to NBN's API
	key := ctx.Param("locationid")
	item, err := cache.Get(key)
	if err == nil {
		// got a hit from the cache, serve that for the request instead
		ctx.JSON(http.StatusAccepted, gin.H{
			"technology": string(item.Value),
			"from_cache": true,
		})
		return
	}

	// cache miss...
	uri := fmt.Sprintf("%s/v2/details/", nbnAPIURI)
	uri += ctx.Param("locationid")
	req, _ := http.NewRequest(http.MethodGet, uri, nil)

	req.Header.Add("Referer", "https://www.nbnco.com.au/")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		ctx.AbortWithStatus(http.StatusBadRequest)
		log.Error("fetching technology details", err)
		return
	}

	technology := &AddressTechnology{}
	err = json.NewDecoder(resp.Body).Decode(technology)
	if err != nil {
		ctx.AbortWithStatus(http.StatusBadRequest)
		log.Error("decoding technology details", err)
		return
	}

	techType := technology.ServingArea.TechType
	err = cache.Set(&memcache.Item{Key: key, Value: []byte(techType)})
	if err != nil {
		log.Error(err)
	}

	ctx.JSON(http.StatusAccepted, gin.H{
		"technology": techType,
		"from_cache": false,
	})
}
