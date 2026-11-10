# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class LinkedInMention < Internal::Types::Model
      field :name, -> { String }, optional: false, nullable: false

      field :urn, -> { String }, optional: false, nullable: false
    end
  end
end
