# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class SpendCeilingExceededEncoded < Internal::Types::Model
      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :ceiling, -> { Integer }, optional: false, nullable: false

      field :committed, -> { Integer }, optional: false, nullable: false

      field :currency, -> { String }, optional: false, nullable: false

      field :requested, -> { Integer }, optional: false, nullable: false
    end
  end
end
