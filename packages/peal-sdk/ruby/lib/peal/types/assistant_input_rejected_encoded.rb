# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AssistantInputRejectedEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::AssistantInputRejectedEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :max_length, -> { Integer }, optional: false, nullable: false, api_name: "maxLength"

      field :reason, -> { Peal::Types::AssistantInputRejectedEncodedReason }, optional: false, nullable: false
    end
  end
end
