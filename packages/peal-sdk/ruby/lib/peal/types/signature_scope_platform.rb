# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class SignatureScopePlatform < Internal::Types::Model
      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: false
    end
  end
end
