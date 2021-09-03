package main.java.de.voidtech.ytparty;

import java.util.Properties;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import main.java.de.voidtech.ytparty.service.ConfigService;

@SpringBootApplication
public class YouTubeParty {
	
	public static void main(String[] args) {
		SpringApplication springApp = new SpringApplication(YouTubeParty.class);
		ConfigService configService = new ConfigService();
		
		Properties properties = new Properties();
		
		properties.put("server.port", configService.getHttpPort());
		properties.put("server.error.whitelabel.enabled", false);
		properties.put("server.error.path", "/error");
		properties.put("spring.datasource.username", configService.getDBUser());
		properties.put("spring.datasource.password", configService.getDBPassword());
		properties.put("spring.datasource.url", configService.getConnectionURL());
		properties.put("spring.jpa.properties.hibernate.dialect", configService.getHibernateDialect());
		properties.put("jdbc.driver", configService.getDriver());
		properties.put("spring.jpa.hibernate.ddl-auto", "update");
		
		springApp.setDefaultProperties(properties);		
		springApp.run(args);
	}
}