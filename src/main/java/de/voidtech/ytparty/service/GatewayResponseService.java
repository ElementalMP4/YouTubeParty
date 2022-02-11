package main.java.de.voidtech.ytparty.service;

import java.io.IOException;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.json.JSONException;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;

import main.java.de.voidtech.ytparty.entities.ephemeral.GatewayConnection;
import main.java.de.voidtech.ytparty.entities.ephemeral.Party;
import main.java.de.voidtech.ytparty.entities.message.SystemMessage;
import main.java.de.voidtech.ytparty.entities.persistent.ChatMessage;

@Service
public class GatewayResponseService {
	
	@Autowired
	private ChatMessageService messageService; //Import the chat message service so that chat messages can be persisted.
	
	private static final Logger LOGGER = Logger.getLogger(GatewayResponseService.class.getName()); //Get the logger for this class

	public void sendError(GatewayConnection session, String error, String origin) {
		try {
			session.getSession().sendMessage(new TextMessage(new JSONObject() //Get the session, send a TextMessage:
					.put("success", false) //Response is not successful
					.put("response", error) //Return the error that occurred
					.put("type", origin) //Say where it came from
					.toString())); //Convert this Java Object to a human-readable JSON string
		} catch (JSONException | IOException e) {
			LOGGER.log(Level.SEVERE, "Error during Service Execution: " + e.getMessage()); //If the message could not send, log an error
		}
	}
	
	public void sendSuccess(GatewayConnection session, JSONObject message, String origin) {
		try {
			session.getSession().sendMessage(new TextMessage(new JSONObject() //Get the session, send a TextMessage:
					.put("success", true) //Response IS successful
					.put("response", message) //Return the handler response (in JSON format)
					.put("type", origin) //Say where it came from
					.toString())); //Convert this Java Object to a human-readable JSON string
		} catch (JSONException | IOException e) {
			LOGGER.log(Level.SEVERE, "Error during Service Execution: " + e.getMessage()); //If the message could not send, log an error
		}
	}
	
	public void sendChatMessage(Party party, ChatMessage message) {
		party.broadcastMessage(message); //Send the message to a party
		messageService.saveMessage(message); //Persist it to the database
	}
	
	public void sendSystemMessage(Party party, SystemMessage systemMessage) {
		party.broadcastMessage(systemMessage); //Send the message to a party
	}
	
	public void sendChatHistory(GatewayConnection session, List<ChatMessage> history) {
		try {
			for (ChatMessage message : history) { //Message history will be provided
				session.getSession().sendMessage(new TextMessage(message.convertToJson())); //Send each message individually
			}
		} catch (IOException e) {
			LOGGER.log(Level.SEVERE, "Error during Service Execution: " + e.getMessage()); //If an error occurs, log it.
		}
	}
}