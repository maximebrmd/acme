# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TooManyFollowUpRulesEncoded < Internal::Types::Model
      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :allowed, -> { Integer }, optional: false, nullable: false
    end
  end
end
