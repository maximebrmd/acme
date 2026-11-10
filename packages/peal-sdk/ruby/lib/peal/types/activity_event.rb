# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ActivityEvent < Internal::Types::Model
      field :actor, -> { Peal::Types::ActivityActor }, optional: false, nullable: false

      field :application, -> { Peal::Types::ActivityApplication }, optional: false, nullable: true

      field :error_code, -> { String }, optional: false, nullable: true, api_name: "errorCode"

      field :id, -> { String }, optional: false, nullable: false

      field :impersonated, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :object_ids, -> { Internal::Types::Hash[String, String] }, optional: false, nullable: false, api_name: "objectIds"

      field :occurred_at, -> { String }, optional: false, nullable: false, api_name: "occurredAt"

      field :operation, -> { String }, optional: false, nullable: false

      field :request_id, -> { String }, optional: false, nullable: true, api_name: "requestId"

      field :status, -> { Integer }, optional: false, nullable: true

      field :via, -> { Peal::Types::ActivityVia }, optional: false, nullable: false
    end
  end
end
