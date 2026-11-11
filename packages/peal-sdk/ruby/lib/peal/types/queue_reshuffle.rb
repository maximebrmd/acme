# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class QueueReshuffle < Internal::Types::Model
      field :moved, -> { Integer }, optional: false, nullable: false

      field :remaining, -> { Integer }, optional: false, nullable: false

      field :stopped_by, -> { Peal::Types::ReshuffleStop }, optional: false, nullable: true, api_name: "stoppedBy"

      field :unchanged, -> { Integer }, optional: false, nullable: false
    end
  end
end
