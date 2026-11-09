# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Me < Internal::Types::Model
      field :impersonated_by, -> { String }, optional: false, nullable: true, api_name: "impersonatedBy"

      field :user, -> { Peal::Types::MeUser }, optional: false, nullable: false

      field :workspaces, -> { Internal::Types::Array[Peal::Types::Membership] }, optional: false, nullable: false
    end
  end
end
