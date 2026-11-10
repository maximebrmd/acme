# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEventWebhookEndpointDisabled < Internal::Types::Model
      field :endpoint_id, -> { String }, optional: false, nullable: false, api_name: "endpointId"

      field :host, -> { String }, optional: false, nullable: false

      field :reason, -> { Peal::Types::WebhookTurnOffReason }, optional: false, nullable: false
    end
  end
end
