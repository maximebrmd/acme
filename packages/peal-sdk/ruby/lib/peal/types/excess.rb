# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class Excess < Internal::Types::Model
      field :allowed, -> { Integer }, optional: false, nullable: false

      field :limit, -> { Peal::Types::HeldLimit }, optional: false, nullable: false

      field :used, -> { Integer }, optional: false, nullable: false
    end
  end
end
