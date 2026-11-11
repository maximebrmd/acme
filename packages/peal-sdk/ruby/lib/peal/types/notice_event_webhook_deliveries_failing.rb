# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEventWebhookDeliveriesFailing < Internal::Types::Model
      field :endpoint_id, -> { String }, optional: false, nullable: false, api_name: "endpointId"

      field :host, -> { String }, optional: false, nullable: false
    end
  end
end
