# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class CustomerWorkspace < Internal::Types::Model
      field :channels, -> { Integer }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false, api_name: "createdAt"

      field :external_id, -> { String }, optional: false, nullable: true, api_name: "externalId"

      field :id, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false
    end
  end
end
