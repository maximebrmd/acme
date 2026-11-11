# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class WebhookRedeliveryOfFailed < Internal::Types::Model
      field :endpoint_id, -> { String }, optional: false, nullable: false, api_name: "endpointId"

      field :event_type, -> { Peal::Types::SubscribableWebhookEventType }, optional: true, nullable: false, api_name: "eventType"

      field :since, -> { String }, optional: true, nullable: false

      field :until_, -> { String }, optional: true, nullable: false, api_name: "until"
    end
  end
end
