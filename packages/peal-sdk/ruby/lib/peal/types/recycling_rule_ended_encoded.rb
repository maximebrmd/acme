# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class RecyclingRuleEndedEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::RecyclingRuleEndedEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :reason, -> { String }, optional: false, nullable: false
    end
  end
end
