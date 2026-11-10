# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class LinkedInOrganization < Internal::Types::Model
      field :name, -> { String }, optional: false, nullable: false

      field :urn, -> { String }, optional: false, nullable: false

      field :vanity_name, -> { String }, optional: false, nullable: true, api_name: "vanityName"
    end
  end
end
